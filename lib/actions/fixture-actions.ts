"use server";

import { db } from "@/lib/db";
import { fixtureOptionsSchema } from "@/lib/validations/match";
import { generateRoundRobin } from "@/lib/engine/round-robin";
import { scheduleMatches, scheduleKnockout } from "@/lib/engine/scheduler";
import { generateBracket } from "@/lib/engine/bracket";
import { requireTournamentEditor, ok, safeResult } from "@/lib/actions/helpers";
import { auditLog } from "@/lib/audit";
import { revalidateTournament } from "@/lib/actions/phase-actions";
import { computeStandardQualifiers } from "@/lib/actions/standings-util";

// ============ Lectura ============

export async function getPhaseMatches(phaseId: string) {
  const matches = await db.match.findMany({
    where: { phaseId },
    include: {
      homeTeam: { select: { id: true, name: true, color: true, shieldUrl: true } },
      awayTeam: { select: { id: true, name: true, color: true, shieldUrl: true } },
      group: { select: { id: true, name: true } },
      phase: { select: { id: true, name: true, type: true, categoryId: true } },
      homePreviousMatch: { select: { id: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true, winnerId: true } },
      awayPreviousMatch: { select: { id: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true, winnerId: true } },
    },
    orderBy: [{ jornada: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });
  return matches;
}

export async function getMatchDetail(matchId: string) {
  return db.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { select: { id: true, name: true, color: true, shieldUrl: true } },
      awayTeam: { select: { id: true, name: true, color: true, shieldUrl: true } },
      group: { select: { id: true, name: true } },
      phase: { include: { category: true } },
      events: { include: { player: { select: { id: true, name: true, jerseyNumber: true } }, team: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
      penaltyShots: { include: { player: { select: { id: true, name: true, jerseyNumber: true } } }, orderBy: { order: "asc" } },
      operators: { include: { user: { select: { id: true, name: true, role: true } } } },
    },
  });
}

// ============ Generación ============

function parseOptions(input: unknown) {
  const parsed = fixtureOptionsSchema.safeParse(input ?? {});
  return {
    data: parsed.success ? parsed.data : undefined,
    rounds: parsed.success ? parsed.data.rounds : 1,
    venues: [
      parsed.success ? parsed.data.venue : undefined,
      "Cancha 2",
    ].filter((v): v is string => Boolean(v)),
    startDate: parsed.success ? parsed.data.scheduledAt : undefined,
    startTime: parsed.success ? parsed.data.startTime : undefined,
    gapMinutes: parsed.success ? parsed.data.gapMinutes : 60,
  };
}

/** Genera el fixture round-robin de una fase de grupos */
export async function generateGroupsFixture(phaseId: string, input: unknown) {
  try {
    const phase = await db.phase.findUnique({
      where: { id: phaseId },
      include: {
        category: { include: { tournament: true } },
        groups: { include: { members: { include: { team: true } } }, orderBy: { position: "asc" } },
      },
    });
    if (!phase) return { success: false as const, error: "Fase no encontrada" };
    if (phase.type !== "GRUPOS") return { success: false as const, error: "No es una fase de grupos" };
    const { ctx } = await requireTournamentEditor(phase.category.tournamentId);
    if (phase.status !== "PENDIENTE") {
      return { success: false as const, error: "La fase ya comenzó; no se puede regenerar" };
    }

    const existing = await db.match.count({ where: { phaseId } });
    if (existing > 0) {
      await db.match.deleteMany({ where: { phaseId } });
    }

    const config = (phase.config ?? {}) as Record<string, unknown>;
    const opts = parseOptions(input);
    const rounds = (config.rounds as number | undefined) ?? opts.rounds;

    const allMatches: { groupId: string; jornada: number; order: number; home: string; away: string; scheduledAt: Date; venue: string | null }[] = [];
    let order = 0;

    for (const group of phase.groups) {
      const teamIds = group.members.map((m) => m.team.id);
      if (teamIds.length < 2) continue;
      const rr = generateRoundRobin(teamIds, rounds);
      const scheduled = scheduleMatches(rr, {
        venues: opts.venues,
        startDate: opts.startDate,
        startTime: opts.startTime,
        gapMinutes: opts.gapMinutes,
      });
      for (const s of scheduled) {
        allMatches.push({
          groupId: group.id,
          jornada: s.jornada,
          order,
          home: s.home,
          away: s.away,
          scheduledAt: s.scheduledAt ?? new Date(),
          venue: s.venue,
        });
        order++;
      }
    }

    if (allMatches.length === 0) {
      return { success: false as const, error: "Los grupos no tienen suficientes equipos (mínimo 2)" };
    }

    await db.match.createMany({
      data: allMatches.map((m) => ({
        tournamentId: phase.category.tournamentId,
        categoryId: phase.categoryId,
        phaseId: phase.id,
        groupId: m.groupId,
        jornada: m.jornada,
        order: m.order,
        homeTeamId: m.home,
        awayTeamId: m.away,
        scheduledAt: m.scheduledAt,
        venue: m.venue,
        status: "PROGRAMADO",
      })),
    });

    await auditLog({
      userId: ctx.userId,
      tournamentId: phase.category.tournamentId,
      action: "FIXTURE_GROUPS_GENERATED",
      entity: "Phase",
      entityId: phase.id,
      details: { matches: allMatches.length },
    });
    await revalidateTournament(phase.category.tournamentId);
    return ok({ count: allMatches.length });
  } catch (error) {
    return safeResult(error);
  }
}

type CreatedRecord = { id: string; round: number; order: number; legIndex: number };

/**
 * Resuelve a qué LLAMADA REAL (match) apunta una referencia de alimentación.
 * En ida y vuelta, la llave que "decide" es el partido de vuelta (legIndex 1);
 * los byes (solo leg 0) caen de vuelta al leg 0.
 */
function resolveFeed(created: Map<string, CreatedRecord>, ref: { round: number; order: number; legIndex: number } | undefined, double: boolean) {
  if (!ref) return null;
  const dig = double && ref.legIndex === 0 ? 1 : ref.legIndex;
  return created.get(`${ref.round}:${ref.order}:${dig}`) ?? (double ? created.get(`${ref.round}:${ref.order}:0`) : null);
}

/** Genera el fixture de llaves (eliminación directa) */
export async function generateKnockoutFixture(phaseId: string, input: unknown) {
  try {
    const phase = await db.phase.findUnique({
      where: { id: phaseId },
      include: { category: { include: { tournament: true } } },
    });
    if (!phase) return { success: false as const, error: "Fase no encontrada" };
    if (phase.type !== "LLAVES") return { success: false as const, error: "No es una fase de llaves" };
    const { ctx } = await requireTournamentEditor(phase.category.tournamentId);
    if (phase.status !== "PENDIENTE") {
      return { success: false as const, error: "La fase ya comenzó" };
    }

    const existing = await db.match.count({ where: { phaseId } });
    if (existing > 0) {
      return { success: false as const, error: "La fase ya tiene partidos; elimínalos primero para regenerar" };
    }

    // Clasificados: desde la fase previa o desde la lista guardada en la fase
    const qualifiers = phase.fromPhaseId
      ? await computeStandardQualifiers(phase.fromPhaseId)
      : ((phase.qualifiers as { teamId: string; teamName?: string; label?: string }[] ?? []).map((q) => ({
          teamId: q.teamId,
          teamName: q.teamName ?? "—",
          label: q.label,
        })));

    if (qualifiers.length < 2) {
      return { success: false as const, error: "Se necesitan al menos 2 clasificados" };
    }

    const config = (phase.config ?? {}) as Record<string, unknown>;
    const leg = (config.leg as "SIMPLE" | "IDA_Y_VUELTA") ?? "SIMPLE";
    const double = leg === "IDA_Y_VUELTA";
    const draft = generateBracket(qualifiers, {
      includeThirdPlace: (config.includeThirdPlace as boolean) ?? true,
      leg,
    });

    const opts = parseOptions(input);
    const scheduled = scheduleKnockout(
      draft.matches.map((m) => ({ order: m.order, legIndex: m.legIndex, round: m.round })),
      {
        venues: opts.venues,
        startDate: opts.startDate,
        startTime: opts.startTime,
        gapMinutes: opts.gapMinutes,
      }
    );

    const created = new Map<string, CreatedRecord>();

    // Pase 1: crear los partidos
    for (let i = 0; i < draft.matches.length; i++) {
      const m = draft.matches[i];
      const sched = scheduled.find((s) => s.order === m.order && s.legIndex === m.legIndex);
      const match = await db.match.create({
        data: {
          tournamentId: phase.category.tournamentId,
          categoryId: phase.categoryId,
          phaseId: phase.id,
          order: m.order,
          jornada: m.round,
          homeTeamId: m.homeTeamId ?? null,
          awayTeamId: m.awayTeamId ?? null,
          homeLabel: m.homeLabel ?? null,
          awayLabel: m.awayLabel ?? null,
          scheduledAt: sched?.scheduledAt ?? null,
          venue: sched?.venue ?? null,
          status: "PROGRAMADO",
        },
        select: { id: true },
      });
      created.set(`${m.round}:${m.order}:${m.legIndex}`, { id: match.id, round: m.round, order: m.order, legIndex: m.legIndex });
    }

    // Pase 2: conectar alimentaciones (ganador -> siguiente ronda, perdedor -> 3er puesto)
    for (const m of draft.matches) {
      const record = created.get(`${m.round}:${m.order}:${m.legIndex}`);
      if (!record) continue;

      const homePrev = resolveFeed(created, m.homeFeedFrom, double);
      const awayPrev = resolveFeed(created, m.awayFeedFrom, double);

      if (m.homeFeedFrom?.slot === "homeLoser" && homePrev) {
        await db.match.update({ where: { id: record.id }, data: { homeLoserPreviousMatchId: homePrev.id } });
      } else if (homePrev) {
        await db.match.update({ where: { id: record.id }, data: { homePreviousMatchId: homePrev.id } });
      }

      if (m.awayFeedFrom?.slot === "awayLoser" && awayPrev) {
        await db.match.update({ where: { id: record.id }, data: { awayLoserPreviousMatchId: awayPrev.id } });
      } else if (awayPrev) {
        await db.match.update({ where: { id: record.id }, data: { awayPreviousMatchId: awayPrev.id } });
      }
    }

    // Pase 3: en ida y vuelta, copiar equipos al partido de vuelta desde la ida
    if (double) {
      for (const m of draft.matches) {
        if (m.legIndex !== 1) continue;
        const first = created.get(`${m.round}:${m.order}:0`);
        const second = created.get(`${m.round}:${m.order}:1`);
        if (!first || !second) continue;
        const firstMatch = await db.match.findUnique({ where: { id: first.id } });
        if (!firstMatch) continue;
        await db.match.update({
          where: { id: second.id },
          data: {
            homeTeamId: firstMatch.awayTeamId,
            awayTeamId: firstMatch.homeTeamId,
            homeLabel: firstMatch.awayLabel,
            awayLabel: firstMatch.homeLabel,
          },
        });
      }
    }

    // Pase 4: byes -> avanzar automáticamente al ganador
    const byes = draft.matches.filter(
      (m) => m.round === 1 && ((m.homeTeamId && !m.awayTeamId) || (!m.homeTeamId && m.awayTeamId))
    );
    for (const bye of byes) {
      const record = created.get(`${bye.round}:${bye.order}:${bye.legIndex}`);
      if (!record) continue;
      const teamId = bye.homeTeamId ?? bye.awayTeamId;
      if (!teamId) continue;
      await db.match.update({
        where: { id: record.id },
        data: { status: "FINALIZADO", winnerId: teamId, startedAt: new Date(), endedAt: new Date() },
      });
      await propagateWinner(record.id, teamId);
    }

    await db.phase.update({
      where: { id: phase.id },
      data: { qualifiers: qualifiers as never },
    });

    await auditLog({
      userId: ctx.userId,
      tournamentId: phase.category.tournamentId,
      action: "FIXTURE_KNOCKOUT_GENERATED",
      entity: "Phase",
      entityId: phase.id,
      details: { matches: created.size, qualifiers: qualifiers.length, leg },
    });
    await revalidateTournament(phase.category.tournamentId);
    return ok({ count: created.size });
  } catch (error) {
    return safeResult(error);
  }
}

/** Actualiza el siguiente partido con el ganador del anterior (o el perdedor para el 3er puesto) */
export async function propagateWinner(matchId: string, winnerTeamId: string) {
  const source = await db.match.findUnique({
    where: { id: matchId },
    select: { homeTeamId: true, awayTeamId: true, winnerId: true, homeScore: true, awayScore: true, homePenalties: true, awayPenalties: true },
  });
  const loserTeamId =
    source && source.winnerId
      ? source.winnerId === source.homeTeamId
        ? source.awayTeamId
        : source.homeTeamId
      : null;

  const nextMatches = await db.match.findMany({
    where: {
      OR: [
        { homePreviousMatchId: matchId },
        { awayPreviousMatchId: matchId },
        { homeLoserPreviousMatchId: matchId },
        { awayLoserPreviousMatchId: matchId },
      ],
    },
  });

  for (const next of nextMatches) {
    const isWinnerSlot =
      next.homePreviousMatchId === matchId || next.awayPreviousMatchId === matchId;
    const teamId = isWinnerSlot ? winnerTeamId : loserTeamId;
    if (!teamId) continue;

    if (next.homePreviousMatchId === matchId || next.homeLoserPreviousMatchId === matchId) {
      await db.match.update({ where: { id: next.id }, data: { homeTeamId: teamId } });
    } else {
      await db.match.update({ where: { id: next.id }, data: { awayTeamId: teamId } });
    }
  }
}

// ============ Edición manual ============

export async function updateMatchSchedule(input: unknown) {
  try {
    const { matchId, scheduledAt, venue } = input as { matchId: string; scheduledAt?: Date | null; venue?: string | null };
    const match = await db.match.findUnique({ where: { id: matchId }, include: { phase: { include: { category: true } } } });
    if (!match) return { success: false as const, error: "Partido no encontrado" };
    const { ctx } = await requireTournamentEditor(match.phase.category.tournamentId);
    const updated = await db.match.update({
      where: { id: matchId },
      data: { scheduledAt: scheduledAt ?? null, venue: venue ?? null },
    });
    await auditLog({
      userId: ctx.userId,
      tournamentId: match.phase.category.tournamentId,
      action: "MATCH_SCHEDULED",
      entity: "Match",
      entityId: matchId,
      details: { scheduledAt, venue },
    });
    await revalidateTournament(match.phase.category.tournamentId);
    return ok(updated);
  } catch (error) {
    return safeResult(error);
  }
}

export async function deleteMatch(matchId: string) {
  try {
    const match = await db.match.findUnique({ where: { id: matchId }, include: { phase: { include: { category: true } } } });
    if (!match) return { success: false as const, error: "Partido no encontrado" };
    const { ctx } = await requireTournamentEditor(match.phase.category.tournamentId);
    if (match.status !== "PROGRAMADO") {
      return { success: false as const, error: "Solo se pueden eliminar partidos programados" };
    }
    await db.match.delete({ where: { id: matchId } });
    await auditLog({
      userId: ctx.userId,
      tournamentId: match.phase.category.tournamentId,
      action: "MATCH_DELETED",
      entity: "Match",
      entityId: matchId,
    });
    await revalidateTournament(match.phase.category.tournamentId);
    return ok();
  } catch (error) {
    return safeResult(error);
  }
}

export async function assignOperators(matchId: string, userId: string, assigned: boolean) {
  try {
    const match = await db.match.findUnique({ where: { id: matchId }, include: { phase: { include: { category: true } } } });
    if (!match) return { success: false as const, error: "Partido no encontrado" };
    const { ctx } = await requireTournamentEditor(match.phase.category.tournamentId);
    if (assigned) {
      await db.matchOperator.upsert({
        where: { matchId_userId: { matchId, userId } },
        create: { matchId, userId },
        update: {},
      });
    } else {
      await db.matchOperator.deleteMany({ where: { matchId, userId } });
    }
    await auditLog({
      userId: ctx.userId,
      tournamentId: match.phase.category.tournamentId,
      action: "OPERATOR_ASSIGN",
      entity: "Match",
      entityId: matchId,
      details: { userId, assigned },
    });
    await revalidateTournament(match.phase.category.tournamentId);
    return ok();
  } catch (error) {
    return safeResult(error);
  }
}

export async function getKnockoutPreview(phaseId: string) {
  const phase = await db.phase.findUnique({ where: { id: phaseId } });
  if (!phase) return null;
  const qualifiers = phase.fromPhaseId
    ? await computeStandardQualifiers(phase.fromPhaseId)
    : ((phase.qualifiers as { teamId: string; teamName?: string; label?: string }[] ?? []).map((q) => ({
        teamId: q.teamId,
        teamName: q.teamName ?? "—",
        label: q.label,
      })));
  if (qualifiers.length < 2) return null;
  const config = (phase.config ?? {}) as Record<string, unknown>;
  const draft = generateBracket(qualifiers, {
    includeThirdPlace: (config.includeThirdPlace as boolean) ?? true,
    leg: (config.leg as "SIMPLE" | "IDA_Y_VUELTA") ?? "SIMPLE",
  });
  return draft;
}