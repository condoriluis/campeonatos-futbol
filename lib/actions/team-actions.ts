"use server";

import { db } from "@/lib/db";
import { teamSchema } from "@/lib/validations/entities";
import { requireTournamentEditor, ok, safeResult } from "@/lib/actions/helpers";
import { auditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function getTeams(categoryId: string) {
  return db.team.findMany({
    where: { categoryId },
    include: { _count: { select: { players: true, groupMembers: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createTeam(input: unknown) {
  try {
    const parsed = teamSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    const { categoryId, ...rest } = parsed.data;
    const category = await db.category.findUnique({
      where: { id: categoryId },
      include: { tournament: true },
    });
    if (!category) return { success: false as const, error: "Categoría no encontrada" };
    const { ctx } = await requireTournamentEditor(category.tournamentId);

    if (category.maxTeams) {
      const count = await db.team.count({ where: { categoryId } });
      if (count >= category.maxTeams) {
        return { success: false as const, error: `Máximo ${category.maxTeams} equipos por categoría` };
      }
    }
    const team = await db.team.create({ data: { ...rest, categoryId } });
    await auditLog({
      userId: ctx.userId,
      tournamentId: category.tournamentId,
      action: "TEAM_CREATED",
      entity: "Team",
      entityId: team.id,
      details: { name: team.name },
    });
    revalidatePath(`/panel/campeonatos/${category.tournamentId}`);
    return ok(team);
  } catch (error) {
    return safeResult(error);
  }
}

export async function updateTeam(id: string, input: unknown) {
  try {
    const team = await db.team.findUnique({ where: { id }, include: { category: true } });
    if (!team) return { success: false as const, error: "Equipo no encontrado" };
    const parsed = teamSchema.safeParse({ ...(input as object), categoryId: team.categoryId });
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    const { ctx } = await requireTournamentEditor(team.category.tournamentId);
    const updated = await db.team.update({ where: { id }, data: parsed.data });
    await auditLog({
      userId: ctx.userId,
      tournamentId: team.category.tournamentId,
      action: "TEAM_UPDATED",
      entity: "Team",
      entityId: id,
    });
    revalidatePath(`/panel/campeonatos/${team.category.tournamentId}`);
    return ok(updated);
  } catch (error) {
    return safeResult(error);
  }
}

export async function changeTeamStatus(id: string, status: "ACTIVO" | "SUSPENDIDO" | "RETIRADO" | "DESCALIFICADO") {
  try {
    const team = await db.team.findUnique({ where: { id }, include: { category: true } });
    if (!team) return { success: false as const, error: "Equipo no encontrado" };
    const { ctx } = await requireTournamentEditor(team.category.tournamentId);

    const hasOngoing = await db.match.count({
      where: {
        OR: [{ homeTeamId: id }, { awayTeamId: id }],
        status: { in: ["EN_VIVO", "DESCANSO"] },
      },
    });
    if (hasOngoing > 0) {
      return { success: false as const, error: "El equipo tiene un partido en curso" };
    }

    const updated = await db.team.update({ where: { id }, data: { status } });
    await auditLog({
      userId: ctx.userId,
      tournamentId: team.category.tournamentId,
      action: "TEAM_STATUS",
      entity: "Team",
      entityId: id,
      details: { status },
    });
    revalidatePath(`/panel/campeonatos/${team.category.tournamentId}`);
    return ok(updated);
  } catch (error) {
    return safeResult(error);
  }
}

export async function deleteTeam(id: string) {
  try {
    const team = await db.team.findUnique({ where: { id }, include: { category: true } });
    if (!team) return { success: false as const, error: "Equipo no encontrado" };
    const { ctx } = await requireTournamentEditor(team.category.tournamentId);
    const inMatches = await db.match.count({
      where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] },
    });
    if (inMatches > 0) {
      return { success: false as const, error: "No se puede eliminar: el equipo participa en partidos" };
    }
    await db.team.delete({ where: { id } });
    await auditLog({
      userId: ctx.userId,
      tournamentId: team.category.tournamentId,
      action: "TEAM_DELETED",
      entity: "Team",
      entityId: id,
    });
    revalidatePath(`/panel/campeonatos/${team.category.tournamentId}`);
    return ok();
  } catch (error) {
    return safeResult(error);
  }
}