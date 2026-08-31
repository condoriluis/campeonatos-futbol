"use server";

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { manualResultSchema, matchEventInputSchema, penaltyShotSchema } from "@/lib/validations/match";
import { requireMatchOperator, requireTournamentEditor, ok, safeResult, getSessionContext } from "@/lib/actions/helpers";
import { auditLog } from "@/lib/audit";
import { revalidateTournament } from "@/lib/actions/phase-actions";
import { broadcastMatchUpdate, broadcastStandingsUpdate } from "@/lib/realtime/server";
import { propagateWinner } from "@/lib/actions/fixture-actions";
import { computePenalties, winnerOfTie } from "@/lib/engine/penalties";

type EventsWithTeam = { type: string; teamId: string | null }[];

function scoreFromEvents(events: EventsWithTeam, homeTeamId?: string | null, awayTeamId?: string | null) {
  let home = 0;
  let away = 0;
  for (const ev of events) {
    if (ev.type !== "GOL" || !ev.teamId) continue;
    if (ev.teamId === homeTeamId) home++;
    else if (ev.teamId === awayTeamId) away++;
  }
  return { home, away };
}

const matchLiveInclude = {
  homeTeam: true,
  awayTeam: true,
  events: { select: { id: true, type: true, teamId: true, playerId: true, minute: true, createdAt: true } },
  penaltyShots: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.MatchInclude;

type MatchLive = Prisma.MatchGetPayload<{ include: typeof matchLiveInclude }>;

function serializeMatch(match: MatchLive) {
  return {
    id: match.id,
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    homePenalties: match.homePenalties,
    awayPenalties: match.awayPenalties,
    winnerId: match.winnerId,
    startedAt: match.startedAt,
    endedAt: match.endedAt,
    homeTeam: match.homeTeam ? { id: match.homeTeam.id, name: match.homeTeam.name, color: match.homeTeam.color } : null,
    awayTeam: match.awayTeam ? { id: match.awayTeam.id, name: match.awayTeam.name, color: match.awayTeam.color } : null,
    events: match.events?.map((e) => ({
      id: e.id,
      type: e.type,
      teamId: e.teamId,
      playerId: e.playerId,
      minute: e.minute,
      createdAt: e.createdAt,
    })),
  };
}

async function broadcastMatch(matchId: string) {
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: matchLiveInclude,
  });
  if (match) {
    await broadcastMatchUpdate(matchId, {
      type: "match:update",
      match: serializeMatch(match),
    });
  }
}

// ============ Control del partido ============

export async function startMatch(matchId: string) {
  try {
    const ctx = await requireMatchOperator(matchId);
    const { match } = ctx;
    if (match.status !== "PROGRAMADO") return { success: false as const, error: "El partido no está programado" };
    if (!match.homeTeamId || !match.awayTeamId) {
      return { success: false as const, error: "Faltan equipos para iniciar" };
    }

    const [updated] = await db.$transaction([
      db.match.update({
        where: { id: matchId },
        data: { status: "EN_VIVO", startedAt: new Date() },
      }),
      db.matchEvent.create({
        data: { matchId, teamId: null, type: "INICIO", createdById: ctx.ctx.userId },
      }),
      db.phase.updateMany({
        where: { id: match.phaseId, status: "PENDIENTE" },
        data: { status: "EN_PROGRESO" },
      }),
    ]);
    await auditLog({ userId: ctx.ctx.userId, tournamentId: match.tournamentId, action: "MATCH_STARTED", entity: "Match", entityId: matchId });
    await broadcastMatch(matchId);
    return ok(updated);
  } catch (error) {
    return safeResult(error);
  }
}

export async function pauseMatch(matchId: string) {
  try {
    const ctx = await requireMatchOperator(matchId);
    if (ctx.match.status !== "EN_VIVO") return { success: false as const, error: "El partido no está en vivo" };
    const [updated] = await db.$transaction([
      db.match.update({ where: { id: matchId }, data: { status: "DESCANSO" } }),
      db.matchEvent.create({ data: { matchId, teamId: null, type: "PAUSA", createdById: ctx.ctx.userId } }),
    ]);
    await broadcastMatch(matchId);
    return ok(updated);
  } catch (error) {
    return safeResult(error);
  }
}

export async function resumeMatch(matchId: string) {
  try {
    const ctx = await requireMatchOperator(matchId);
    if (ctx.match.status !== "DESCANSO") return { success: false as const, error: "El partido está en descanso" };
    const [updated] = await db.$transaction([
      db.match.update({ where: { id: matchId }, data: { status: "EN_VIVO" } }),
      db.matchEvent.create({ data: { matchId, teamId: null, type: "REANUDAR", createdById: ctx.ctx.userId } }),
    ]);
    await broadcastMatch(matchId);
    return ok(updated);
  } catch (error) {
    return safeResult(error);
  }
}

// ============ Eventos (gol, tarjeta, cambio) ============

export async function addMatchEvent(input: unknown) {
  try {
    const parsed = matchEventInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    const { matchId, teamId, playerId, type, minute, note } = parsed.data;
    const ctx = await requireMatchOperator(matchId);

    if (type === "GOL" && !teamId) return { success: false as const, error: "Selecciona el equipo que convierte" };
    if (["GOL", "AMARILLA", "ROJA"].includes(type) && !playerId) {
      return { success: false as const, error: "Selecciona el jugador" };
    }
    if (type === "GOL" && playerId) {
      const player = await db.player.findUnique({ where: { id: playerId } });
      if (player && teamId && player.teamId !== teamId) {
        return { success: false as const, error: "El jugador no pertenece a ese equipo" };
      }
    }

    if (["GOL", "AMARILLA", "ROJA", "CAMBIO"].includes(type) && ctx.match.status !== "EN_VIVO") {
      return { success: false as const, error: "El partido debe estar en vivo" };
    }

    const match = await db.match.update({
      where: { id: matchId },
      data: {
        events: {
          create: {
            teamId: teamId ?? null,
            ...(playerId ? { playerId } : {}),
            type,
            minute: minute ?? null,
            note: note ?? null,
            createdById: ctx.ctx.userId,
          },
        },
      },
      include: { events: { select: { type: true, teamId: true } } },
    });

    // Actualizar marcador en vivo si es gol
    if (type === "GOL") {
      const { home, away } = scoreFromEvents(match.events, match.homeTeamId, match.awayTeamId);
      await db.match.update({
        where: { id: matchId },
        data: { homeScore: home, awayScore: away },
      });
    }

    await auditLog({
      userId: ctx.ctx.userId,
      tournamentId: match.tournamentId,
      action: `MATCH_EVENT_${type}`,
      entity: "Match",
      entityId: matchId,
      details: { playerId, teamId, minute, note },
    });
    await broadcastMatch(matchId);
    return ok();
  } catch (error) {
    return safeResult(error);
  }
}

export async function removeLastEvent(matchId: string) {
  try {
    const ctx = await requireMatchOperator(matchId);
    if (["FINALIZADO", "CANCELADO"].includes(ctx.match.status)) {
      return { success: false as const, error: "El partido está cerrado" };
    }
    const last = await db.matchEvent.findFirst({
      where: { matchId },
      orderBy: { createdAt: "desc" },
    });
    if (!last) return { success: false as const, error: "No hay eventos para quitar" };
    if (["INICIO", "FIN"].includes(last.type)) {
      return { success: false as const, error: "No se puede quitar este evento" };
    }
    await db.matchEvent.delete({ where: { id: last.id } });

    const match = await db.match.findUnique({
      where: { id: matchId },
      include: { events: { select: { type: true, teamId: true } } },
    });
    if (match) {
      const { home, away } = scoreFromEvents(match.events, match.homeTeamId, match.awayTeamId);
      await db.match.update({ where: { id: matchId }, data: { homeScore: home, awayScore: away } });
    }
    await broadcastMatch(matchId);
    return ok(last);
  } catch (error) {
    return safeResult(error);
  }
}

// ============ Finalización ============

export async function finishMatch(matchId: string) {
  try {
    const ctx = await requireMatchOperator(matchId);
    const match = await db.match.findUnique({
      where: { id: matchId },
      include: {
        events: { select: { type: true, teamId: true } },
        phase: { include: { category: true } },
      },
    });
    if (!match) return { success: false as const, error: "Partido no encontrado" };
    if (match.status === "FINALIZADO") return { success: false as const, error: "El partido ya está finalizado" };
    if (match.status !== "EN_VIVO" && match.status !== "DESCANSO") {
      return { success: false as const, error: "El partido no está en curso" };
    }

    const { home, away } = scoreFromEvents(match.events, match.homeTeamId, match.awayTeamId);
    const rules = await db.tournamentRules.findUnique({ where: { tournamentId: match.tournamentId } });
    const isKnockout = match.phase.type === "LLAVES";
    const needsPenalties = isKnockout && home === away && (rules?.penaltiesEnabled ?? true);

    let winnerId: string | null = null;
    if (!needsPenalties) {
      if (home > away) winnerId = match.homeTeamId;
      else if (away > home) winnerId = match.awayTeamId;
      else if (!isKnockout) winnerId = null;
    }

    await db.$transaction([
      db.matchEvent.create({ data: { matchId, teamId: null, type: "FIN", createdById: ctx.ctx.userId } }),
      db.match.update({
        where: { id: matchId },
        data: {
          homeScore: home,
          awayScore: away,
          status: "FINALIZADO",
          endedAt: new Date(),
          ...(needsPenalties ? { usePenalties: true } : { winnerId }),
        },
      }),
    ]);

    await auditLog({
      userId: ctx.ctx.userId,
      tournamentId: match.tournamentId,
      action: "MATCH_FINISHED",
      entity: "Match",
      entityId: matchId,
      details: { homeScore: home, awayScore: away, needsPenalties },
    });

    // Propagación de ganador en llaves (o perdedores hacia el 3er puesto)
    if (isKnockout && winnerId) {
      await propagateWinner(matchId, winnerId);
    }

    if (isKnockout && winnerId) {
      await maybeFinalizePhaseAndChampion(match.phaseId, match.phase.category.tournamentId);
    } else if (!isKnockout) {
      await broadcastStandingsUpdate(match.tournamentId);
    }

    await broadcastMatch(matchId);
    await revalidateTournament(match.tournamentId);

    return ok({ home, away, needsPenalties, winnerId });
  } catch (error) {
    return safeResult(error);
  }
}

// ============ Resultado manual (correcciones/mesa) ============

export async function setManualResult(input: unknown) {
  try {
    const parsed = manualResultSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    const { matchId, homeScore, awayScore, usePenalties, homePenalties, awayPenalties } = parsed.data;

    const match = await db.match.findUnique({
      where: { id: matchId },
      include: { phase: true, nextAsHomeMatches: { select: { id: true } }, nextAsAwayMatches: { select: { id: true } } },
    });
    if (!match) return { success: false as const, error: "Partido no encontrado" };

    const { ctx } = match.phase.type === "LLAVES"
      ? await requireTournamentEditor(match.tournamentId)
      : await requireMatchOperator(matchId);

    const isKnockout = match.phase.type === "LLAVES";
    let winnerId: string | null = null;

    if (isKnockout) {
      // llaves a 2 partidos (ida y vuelta): considerar el agregado
      const pair = await findTiePair(match);
      if (pair && pair.homeScore != null && pair.awayScore != null) {
        const isLeg = match.id > pair.id;
        const res = isLeg
          ? winnerOfTie(pair.homeScore!, pair.awayScore!, homeScore, awayScore, homePenalties ?? null, awayPenalties ?? null)
          : winnerOfTie(homeScore, awayScore, pair.homeScore!, pair.awayScore!, homePenalties ?? null, awayPenalties ?? null);
        if (res.winner) winnerId = res.winner === "home" ? match.homeTeamId : match.awayTeamId;
      }
    }
    if (!winnerId && homeScore !== awayScore) {
      winnerId = homeScore > awayScore ? match.homeTeamId : match.awayTeamId;
    } else if (homeScore !== awayScore) {
      winnerId = homeScore > awayScore ? match.homeTeamId : match.awayTeamId;
    }

    await db.match.update({
      where: { id: matchId },
      data: {
        homeScore,
        awayScore,
        homePenalties: usePenalties ? (homePenalties ?? null) : null,
        awayPenalties: usePenalties ? (awayPenalties ?? null) : null,
        usePenalties: Boolean(usePenalties),
        winnerId,
        status: "FINALIZADO",
        startedAt: match.startedAt ?? new Date(),
        endedAt: new Date(),
      },
    });

    await auditLog({
      userId: ctx.userId,
      tournamentId: match.tournamentId,
      action: "MATCH_MANUAL_RESULT",
      entity: "Match",
      entityId: matchId,
      details: { homeScore, awayScore, homePenalties, awayPenalties },
    });

    if (match.phase.type === "LLAVES" && winnerId) {
      await propagateWinner(matchId, winnerId);
      await maybeFinalizePhaseAndChampion(match.phaseId, match.tournamentId);
    } else {
      await broadcastStandingsUpdate(match.tournamentId);
    }
    await broadcastMatch(matchId);
    await revalidateTournament(match.tournamentId);
    return ok({ winnerId });
  } catch (error) {
    return safeResult(error);
  }
}

async function findTiePair(match: { id: string; order: number; phaseId: string }) {
  return db.match.findFirst({
    where: { phaseId: match.phaseId, order: match.order, id: { not: match.id } },
  });
}

// ============ Penales ============

export async function recordPenalty(input: unknown) {
  try {
    const parsed = penaltyShotSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    const { matchId, teamId, playerId, result } = parsed.data;
    const ctx = await requireMatchOperator(matchId);
    const match = await db.match.findUnique({
      where: { id: matchId },
      include: { phase: true, penaltyShots: true },
    });
    if (!match) return { success: false as const, error: "Partido no encontrado" };
    if (match.status !== "FINALIZADO") {
      return { success: false as const, error: "Finaliza el partido (empate) para ir a penales" };
    }
    if (!match.usePenalties) {
      return { success: false as const, error: "Este partido no definió penales" };
    }

    if (playerId) {
      const player = await db.player.findUnique({ where: { id: playerId } });
      if (player && player.teamId !== teamId) {
        return { success: false as const, error: "El jugador no pertenece a ese equipo" };
      }
    }

    const rules = await db.tournamentRules.findUnique({ where: { tournamentId: match.tournamentId } });
    const initialCount = rules?.penaltiesCount ?? 5;

    const nextOrder = match.penaltyShots.filter((s) => s.teamId === teamId).length + 1;
    await db.penaltyShot.create({
      data: { matchId, teamId, playerId: playerId ?? null, order: nextOrder, result },
    });

    const shots = await db.penaltyShot.findMany({ where: { matchId }, orderBy: { createdAt: "asc" } });
    if (!match.homeTeamId || !match.awayTeamId) return ok();

    const status = computePenalties(
      match.homeTeamId,
      match.awayTeamId,
      shots.map((s) => ({ order: s.order, teamId: s.teamId, converted: s.result === "CONVERTIDO" })),
      initialCount
    );

    if (status.finished && status.winnerTeamId) {
      await db.$transaction([
        db.match.update({
          where: { id: matchId },
          data: {
            winnerId: status.winnerTeamId,
            homePenalties: status.home.goals,
            awayPenalties: status.away.goals,
          },
        }),
        db.matchEvent.create({
          data: {
            matchId,
            teamId: null,
            type: "FIN",
            note: `Ganó en penales ${status.home.goals}-${status.away.goals}`,
            createdById: ctx.ctx.userId,
          },
        }),
      ]);
      await auditLog({
        userId: ctx.ctx.userId,
        tournamentId: match.tournamentId,
        action: "MATCH_PENALTIES_FINISHED",
        entity: "Match",
        entityId: matchId,
        details: { home: status.home.goals, away: status.away.goals, winner: status.winnerTeamId },
      });
      if (match.phase.type === "LLAVES" && status.winnerTeamId) {
        await propagateWinner(matchId, status.winnerTeamId);
        await maybeFinalizePhaseAndChampion(match.phaseId, match.tournamentId);
      }
      await broadcastMatch(matchId);
      return ok({ ...status, winnerTeamId: status.winnerTeamId });
    }

    await broadcastMatch(matchId);
    return ok(status);
  } catch (error) {
    return safeResult(error);
  }
}

export async function deleteLastPenalty(matchId: string) {
  try {
    await requireMatchOperator(matchId);
    const match = await db.match.findUnique({
      where: { id: matchId },
      include: { phase: true },
    });
    if (!match) return { success: false as const, error: "Partido no encontrado" };
    if (match.status !== "FINALIZADO") {
      return { success: false as const, error: "El partido no está finalizado" };
    }
    const last = await db.penaltyShot.findFirst({ where: { matchId }, orderBy: { createdAt: "desc" } });
    if (!last) return { success: false as const, error: "No hay lanzamientos para quitar" };
    await db.penaltyShot.delete({ where: { id: last.id } });
    // Si ya había ganador, se limpia para permitir re-registro
    const shots = await db.penaltyShot.findMany({ where: { matchId }, orderBy: { createdAt: "asc" } });
    if (match.homeTeamId && match.awayTeamId && shots.length > 0) {
      const rules = await db.tournamentRules.findUnique({ where: { tournamentId: match.tournamentId } });
      const status = computePenalties(
        match.homeTeamId,
        match.awayTeamId,
        shots.map((s) => ({ order: s.order, teamId: s.teamId, converted: s.result === "CONVERTIDO" })),
        rules?.penaltiesCount ?? 5
      );
      if (!status.finished) {
        await db.match.update({
          where: { id: matchId },
          data: { winnerId: null, homePenalties: null, awayPenalties: null },
        });
      }
    }
    await broadcastMatch(matchId);
    return ok();
  } catch (error) {
    return safeResult(error);
  }
}

// ============ Reversión ============

export async function revertMatch(matchId: string) {
  try {
    const { ctx, match } = await requireMatchOperator(matchId);
    if (match.status !== "FINALIZADO") return { success: false as const, error: "Solo se revierten partidos finalizados" };
    const wasStarted = Boolean(match.startedAt);
    await db.$transaction([
      db.matchEvent.deleteMany({
        where: { matchId, type: { in: ["GOL", "AMARILLA", "ROJA", "CAMBIO", "INICIO", "REANUDAR", "PAUSA"] } },
      }),
      db.penaltyShot.deleteMany({ where: { matchId } }),
      db.match.update({
        where: { id: matchId },
        data: {
          status: wasStarted ? "EN_VIVO" : "PROGRAMADO",
          homeScore: null,
          awayScore: null,
          homePenalties: null,
          awayPenalties: null,
          usePenalties: false,
          winnerId: null,
          endedAt: null,
        },
      }),
    ]);
    await auditLog({
      userId: ctx.userId,
      tournamentId: match.tournamentId,
      action: "MATCH_REVERTED",
      entity: "Match",
      entityId: matchId,
    });
    await broadcastStandingsUpdate(match.tournamentId);
    await broadcastMatch(matchId);
    await revalidateTournament(match.tournamentId);
    return ok();
  } catch (error) {
    return safeResult(error);
  }
}

export async function reopenMatch(matchId: string) {
  return revertMatch(matchId);
}

// ============ Utilidades internas ============

async function maybeFinalizePhaseAndChampion(phaseId: string, tournamentId: string) {
  const phase = await db.phase.findUnique({ where: { id: phaseId }, include: { category: true } });
  if (!phase) return;

  const unfinished = await db.match.count({ where: { phaseId, status: { not: "FINALIZADO" } } });
  if (unfinished === 0) {
    await db.phase.update({ where: { id: phaseId }, data: { status: "FINALIZADO" } });
  }

  // Proclamar campeón si la fase de llaves ya terminó y es la última de la categoría
  if (phase.type === "LLAVES" && unfinished === 0) {
    const last = await db.phase.findFirst({
      where: { categoryId: phase.categoryId },
      orderBy: { position: "desc" },
    });
    // La final (no el 3º puesto) es la llave finalizada con ganador sin alimentar por perdedores
    const finalMatch = await db.match.findFirst({
      where: {
        phaseId,
        status: "FINALIZADO",
        winnerId: { not: null },
        homeLoserPreviousMatchId: null,
        awayLoserPreviousMatchId: null,
      },
      orderBy: { order: "asc" },
    });
    if (last && last.id === phaseId && finalMatch?.winnerId) {
      await db.category.update({
        where: { id: phase.categoryId },
        data: { championTeamId: finalMatch.winnerId },
      });
      await db.tournament.update({
        where: { id: tournamentId },
        data: { status: "FINALIZADO" },
      });
      const session = await getSessionContext();
      await auditLog({
        userId: session?.userId,
        tournamentId,
        action: "CATEGORY_CHAMPION",
        entity: "Category",
        entityId: phase.categoryId,
        details: { championTeamId: finalMatch.winnerId },
      });
    }
  }
}