"use server";

import { db } from "@/lib/db";
import { drawSchema, autoDrawSchema } from "@/lib/validations/match";
import { requireTournamentEditor, ok, safeResult } from "@/lib/actions/helpers";
import { distributeIntoGroups } from "@/lib/engine/round-robin";
import { auditLog } from "@/lib/audit";
import { revalidateTournament } from "@/lib/actions/phase-actions";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function getGroupTeams(phaseId: string) {
  return db.group.findMany({
    where: { phaseId },
    include: { members: { include: { team: true }, orderBy: { seed: "asc" } } },
    orderBy: { position: "asc" },
  });
}

/** Asignación manual de equipos a grupos */
export async function assignGroups(input: unknown) {
  try {
    const parsed = drawSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    const { assignments } = parsed.data;

    const phase = await db.phase.findUnique({ where: { id: parsed.data.phaseId }, include: { category: { include: { tournament: true } } } });
    if (!phase) return { success: false as const, error: "Fase no encontrada" };
    if (phase.type !== "GRUPOS") return { success: false as const, error: "El sorteo aplica a fases de grupos" };
    const { ctx } = await requireTournamentEditor(phase.category.tournamentId);
    if (phase.status !== "PENDIENTE") {
      return { success: false as const, error: "La fase ya comenzó" };
    }

    const validTeams = await db.team.findMany({
      where: { categoryId: phase.categoryId, status: "ACTIVO" },
      select: { id: true },
    });
    const validIds = new Set(validTeams.map((t) => t.id));
    const validGroups = await db.group.findMany({
      where: { phaseId: phase.id },
      select: { id: true },
    });
    const validGroupIds = new Set(validGroups.map((g) => g.id));

    const filtered = assignments.filter(
      (a) => validIds.has(a.teamId) && validGroupIds.has(a.groupId)
    );

    await db.$transaction([
      db.groupTeam.deleteMany({ where: { group: { phaseId: phase.id } } }),
      db.groupTeam.createMany({
        data: filtered.map((a, i) => ({
          groupId: a.groupId,
          teamId: a.teamId,
          seed: a.seed ?? i,
        })),
      }),
    ]);

    await auditLog({
      userId: ctx.userId,
      tournamentId: phase.category.tournamentId,
      action: "DRAW_ASSIGN",
      entity: "Phase",
      entityId: phase.id,
      details: { count: filtered.length },
    });
    await revalidateTournament(phase.category.tournamentId);
    return ok({ count: filtered.length });
  } catch (error) {
    return safeResult(error);
  }
}

/** Sorteo automático: distribuye los equipos en grupos balanceados */
export async function autoDraw(input: unknown) {
  try {
    const parsed = autoDrawSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    const phase = await db.phase.findUnique({
      where: { id: parsed.data.phaseId },
      include: { category: { include: { tournament: true } }, groups: true },
    });
    if (!phase) return { success: false as const, error: "Fase no encontrada" };
    if (phase.type !== "GRUPOS") return { success: false as const, error: "El sorteo aplica a fases de grupos" };
    const { ctx } = await requireTournamentEditor(phase.category.tournamentId);
    if (phase.status !== "PENDIENTE") {
      return { success: false as const, error: "La fase ya comenzó" };
    }

    const teams = await db.team.findMany({
      where: { categoryId: phase.categoryId, status: { in: ["ACTIVO", "PENDIENTE"] } },
      include: { groupMembers: { where: { group: { phaseId: phase.id } } } },
      orderBy: { name: "asc" },
    });
    if (teams.length === 0) return { success: false as const, error: "No hay equipos para sortear" };

    const config = phase.config as Record<string, unknown>;
    const groupCount = Math.min((config.groupCount as number) ?? 2, phase.groups.length);

    // Cabezas de serie van a grupos distintos; el resto aleatorio balanceado
    const seeds = parsed.data.seedsFirst ?? [];
    const seedTeams = teams.filter((t) => seeds.includes(t.id));
    const restTeams = teams.filter((t) => !seeds.includes(t.id));

    if (restTeams.length === 0) {
      return { success: false as const, error: "Debe sortearse al menos un equipo no cabeza de serie" };
    }

    const groupsArr = phase.groups.slice(0, groupCount);
    const distribution = distributeIntoGroups(
      shuffle(restTeams.map((t) => t.id)),
      groupCount - seedTeams.length
    );

    // Ubicar cabezas de serie en los primeros grupos
    const assignments: { groupId: string; teamId: string; seed: number }[] = [];
    seedTeams.forEach((team, i) => {
      const group = groupsArr[i % groupsArr.length];
      assignments.push({ groupId: group.id, teamId: team.id, seed: 1 });
    });
    distribution.forEach((teamIds, gi) => {
      const group = groupsArr[(gi + seedTeams.length) % groupsArr.length];
      teamIds.forEach((teamId, si) => {
        assignments.push({ groupId: group.id, teamId, seed: si + 2 });
      });
    });

    await db.$transaction([
      db.groupTeam.deleteMany({ where: { group: { phaseId: phase.id } } }),
      db.groupTeam.createMany({ data: assignments }),
    ]);

    await auditLog({
      userId: ctx.userId,
      tournamentId: phase.category.tournamentId,
      action: "DRAW_AUTO",
      entity: "Phase",
      entityId: phase.id,
      details: { teams: teams.length, groups: groupCount },
    });
    await revalidateTournament(phase.category.tournamentId);
    return ok({ count: teams.length });
  } catch (error) {
    return safeResult(error);
  }
}