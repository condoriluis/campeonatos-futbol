"use server";

import { db } from "@/lib/db";
import { createPhaseSchema, groupsConfigSchema, knockoutConfigSchema } from "@/lib/validations/match";
import { requireTournamentEditor, ok, safeResult } from "@/lib/actions/helpers";
import { auditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function revalidateTournament(tournamentId: string) {
  revalidatePath(`/panel/campeonatos/${tournamentId}`);
}

export async function listPhases(categoryId: string) {
  return db.phase.findMany({
    where: { categoryId },
    include: {
      groups: { include: { members: { include: { team: true } } }, orderBy: { position: "asc" } },
      fromPhase: { select: { id: true, name: true, type: true } },
      _count: { select: { matches: true } },
    },
    orderBy: { position: "asc" },
  });
}

export async function getPhase(id: string) {
  return db.phase.findUnique({
    where: { id },
    include: {
      groups: { include: { members: { include: { team: true } }, _count: { select: { matches: true } } }, orderBy: { position: "asc" } },
      category: { include: { tournament: true } },
      fromPhase: true,
    },
  });
}

export async function getPhasesSummary(categoryId: string) {
  const phases = await db.phase.findMany({
    where: { categoryId },
    include: {
      groups: { include: { _count: { select: { members: true, matches: true } } }, orderBy: { position: "asc" } },
    },
    orderBy: { position: "asc" },
  });
  return phases;
}

function letter(i: number) {
  return String.fromCharCode(65 + i);
}

export async function createPhase(input: unknown) {
  try {
    const parsed = createPhaseSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    const { categoryId, name, type, fromPhaseId, config } = parsed.data;
    const category = await db.category.findUnique({ where: { id: categoryId }, include: { tournament: true } });
    if (!category) return { success: false as const, error: "Categoría no encontrada" };
    const { ctx } = await requireTournamentEditor(category.tournamentId);

    const position = await db.phase.count({ where: { categoryId } });

    // Configuración por defecto según tipo
    let phaseConfig: Record<string, unknown> = {};
    if (type === "GRUPOS") {
      const c = groupsConfigSchema.safeParse(config ?? {});
      phaseConfig = { groupCount: c.success ? c.data.groupCount : 2, rounds: c.success ? c.data.rounds : 1, classifyPerGroup: c.success ? c.data.classifyPerGroup : 2, bestThirds: c.success ? c.data.bestThirds : 0 };
    } else {
      const c = knockoutConfigSchema.safeParse(config ?? {});
      phaseConfig = { includeThirdPlace: c.success ? c.data.includeThirdPlace : true, leg: c.success ? c.data.leg : "SIMPLE" };
    }

    let fromPhase: string | null = fromPhaseId ?? null;
    const qualifiers: { teamId: string; label?: string }[] = [];
    // Si se indica la fase previa, calcular clasificados y guardarlos
    if (fromPhase && type === "LLAVES") {
      const prev = await db.phase.findUnique({ where: { id: fromPhase } });
      if (!prev) fromPhase = null;
    }

    const phase = await db.phase.create({
      data: {
        categoryId,
        name,
        type,
        position,
        fromPhaseId: fromPhase,
        config: phaseConfig as never,
        qualifiers,
      },
    });

    // Crear grupos para fase de grupos
    const groupCount = (phaseConfig.groupCount as number) ?? 2;
    if (type === "GRUPOS") {
      const data = Array.from({ length: groupCount }, (_, i) => ({
        phaseId: phase.id,
        name: letter(i),
        position: i,
      }));
      await db.group.createMany({ data });
    }

    await auditLog({
      userId: ctx.userId,
      tournamentId: category.tournamentId,
      action: "PHASE_CREATED",
      entity: "Phase",
      entityId: phase.id,
      details: { name, type, config: phaseConfig },
    });
    await revalidateTournament(category.tournamentId);
    return ok(phase);
  } catch (error) {
    return safeResult(error);
  }
}

export async function updatePhaseConfig(id: string, config: Record<string, unknown>) {
  try {
    const phase = await db.phase.findUnique({ where: { id }, include: { category: { include: { tournament: true } } } });
    if (!phase) return { success: false as const, error: "Fase no encontrada" };
    const { ctx } = await requireTournamentEditor(phase.category.tournamentId);
    if (phase.status !== "PENDIENTE") {
      return { success: false as const, error: "La fase ya comenzó; no se puede cambiar su formato" };
    }
    const updated = await db.phase.update({ where: { id }, data: { config: config as never } });
    await auditLog({
      userId: ctx.userId,
      tournamentId: phase.category.tournamentId,
      action: "PHASE_CONFIG",
      entity: "Phase",
      entityId: id,
      details: config,
    });
    await revalidateTournament(phase.category.tournamentId);
    return ok(updated);
  } catch (error) {
    return safeResult(error);
  }
}

export async function updatePhaseStatus(id: string, status: "PENDIENTE" | "EN_PROGRESO" | "FINALIZADO") {
  try {
    const phase = await db.phase.findUnique({
      where: { id },
      include: { category: { include: { tournament: true } }, _count: { select: { matches: true } } },
    });
    if (!phase) return { success: false as const, error: "Fase no encontrada" };
    const { ctx } = await requireTournamentEditor(phase.category.tournamentId);

    if (status === "FINALIZADO" && phase.status !== "FINALIZADO") {
      const unfinished = await db.match.count({
        where: { phaseId: id, status: { not: "FINALIZADO" } },
      });
      if (unfinished > 0) {
        return { success: false as const, error: `Hay ${unfinished} partidos sin finalizar` };
      }
      // Persistir posiciones oficiales de la fase de grupos
      if (phase.type === "GRUPOS") {
        await persistOfficialStandings(phase.id);
      } else if (phase.type === "LLAVES") {
        // marcar campeón cuando es la última fase
        await maybeSetChampion(phase.id, ctx.userId);
      }
    }

    const updated = await db.phase.update({ where: { id }, data: { status } });
    await auditLog({
      userId: ctx.userId,
      tournamentId: phase.category.tournamentId,
      action: "PHASE_STATUS",
      entity: "Phase",
      entityId: id,
      details: { status },
    });
    await revalidateTournament(phase.category.tournamentId);
    return ok(updated);
  } catch (error) {
    return safeResult(error);
  }
}

export async function deletePhase(id: string) {
  try {
    const phase = await db.phase.findUnique({ where: { id }, include: { category: { include: { tournament: true } }, _count: { select: { matches: true } } } });
    if (!phase) return { success: false as const, error: "Fase no encontrada" };
    const { ctx } = await requireTournamentEditor(phase.category.tournamentId);
    if (phase._count.matches > 0) {
      return { success: false as const, error: "Elimina primero los partidos de esta fase" };
    }
    await db.phase.delete({ where: { id } });
    await auditLog({
      userId: ctx.userId,
      tournamentId: phase.category.tournamentId,
      action: "PHASE_DELETED",
      entity: "Phase",
      entityId: id,
    });
    await revalidateTournament(phase.category.tournamentId);
    return ok();
  } catch (error) {
    return safeResult(error);
  }
}

async function persistOfficialStandings(phaseId: string) {
  const { computeGroupStandingsData } = await import("@/lib/actions/standings-actions");
  await computeGroupStandingsData(phaseId, true);
}

async function maybeSetChampion(finalPhaseId: string, userId: string) {
  const finalMatch = await db.match.findFirst({
    where: { phaseId: finalPhaseId, status: "FINALIZADO", winnerId: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (finalMatch?.winnerId) {
    const phase = await db.phase.findUnique({ where: { id: finalPhaseId }, include: { category: true } });
    if (phase) {
      // Es campeón si es la última fase de la categoría
      const last = await db.phase.findFirst({
        where: { categoryId: phase.categoryId },
        orderBy: { position: "desc" },
      });
      if (last && last.id === finalPhaseId) {
        await db.tournament.update({
          where: { id: phase.category.tournamentId },
          data: { championTeamId: finalMatch.winnerId, status: "FINALIZADO" },
        });
        await auditLog({
          userId,
          tournamentId: phase.category.tournamentId,
          action: "TOURNAMENT_CHAMPION",
          entity: "Match",
          entityId: finalPhaseId,
          details: { championTeamId: finalMatch.winnerId },
        });
      }
    }
  }
}