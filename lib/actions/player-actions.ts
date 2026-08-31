"use server";

import { db } from "@/lib/db";
import { playerSchema, bulkPlayersSchema } from "@/lib/validations/entities";
import { requireTournamentEditor, ok, safeResult } from "@/lib/actions/helpers";
import { auditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function getPlayers(teamId: string) {
  return db.player.findMany({
    where: { teamId },
    orderBy: [{ jerseyNumber: "asc" }, { name: "asc" }],
  });
}

export async function createPlayer(input: unknown) {
  try {
    const parsed = playerSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    const { teamId, ...rest } = parsed.data;
    const team = await db.team.findUnique({ where: { id: teamId }, include: { category: true } });
    if (!team) return { success: false as const, error: "Equipo no encontrado" };
    const { ctx } = await requireTournamentEditor(team.category.tournamentId);

    const player = await db.player.create({ data: { ...rest, teamId } });
    await auditLog({
      userId: ctx.userId,
      tournamentId: team.category.tournamentId,
      action: "PLAYER_CREATED",
      entity: "Player",
      entityId: player.id,
    });
    revalidatePath(`/panel/campeonatos/${team.category.tournamentId}`);
    return ok(player);
  } catch (error) {
    return safeResult(error);
  }
}

export async function updatePlayer(id: string, input: unknown) {
  try {
    const player = await db.player.findUnique({
      where: { id },
      include: { team: { include: { category: true } } },
    });
    if (!player) return { success: false as const, error: "Jugador no encontrado" };
    const parsed = playerSchema.safeParse({ ...(input as object), teamId: player.teamId });
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    const { ctx } = await requireTournamentEditor(player.team.category.tournamentId);
    const updated = await db.player.update({ where: { id }, data: parsed.data });
    await auditLog({
      userId: ctx.userId,
      tournamentId: player.team.category.tournamentId,
      action: "PLAYER_UPDATED",
      entity: "Player",
      entityId: id,
    });
    revalidatePath(`/panel/campeonatos/${player.team.category.tournamentId}`);
    return ok(updated);
  } catch (error) {
    return safeResult(error);
  }
}

export async function togglePlayerStatus(id: string) {
  try {
    const player = await db.player.findUnique({
      where: { id },
      include: { team: { include: { category: true } } },
    });
    if (!player) return { success: false as const, error: "Jugador no encontrado" };
    const { ctx } = await requireTournamentEditor(player.team.category.tournamentId);
    const updated = await db.player.update({
      where: { id },
      data: { status: player.status === "HABILITADO" ? "INHABILITADO" : "HABILITADO" },
    });
    await auditLog({
      userId: ctx.userId,
      tournamentId: player.team.category.tournamentId,
      action: "PLAYER_STATUS",
      entity: "Player",
      entityId: id,
      details: { status: updated.status },
    });
    revalidatePath(`/panel/campeonatos/${player.team.category.tournamentId}`);
    return ok(updated);
  } catch (error) {
    return safeResult(error);
  }
}

export async function deletePlayer(id: string) {
  try {
    const player = await db.player.findUnique({
      where: { id },
      include: { team: { include: { category: true } } },
    });
    if (!player) return { success: false as const, error: "Jugador no encontrado" };
    const { ctx } = await requireTournamentEditor(player.team.category.tournamentId);
    await db.player.delete({ where: { id } });
    await auditLog({
      userId: ctx.userId,
      tournamentId: player.team.category.tournamentId,
      action: "PLAYER_DELETED",
      entity: "Player",
      entityId: id,
    });
    revalidatePath(`/panel/campeonatos/${player.team.category.tournamentId}`);
    return ok();
  } catch (error) {
    return safeResult(error);
  }
}

/** Carga la nómina completa de un equipo de una sola vez */
export async function bulkCreatePlayers(input: unknown) {
  try {
    const parsed = bulkPlayersSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    const { teamId, players } = parsed.data;
    const team = await db.team.findUnique({ where: { id: teamId }, include: { category: true } });
    if (!team) return { success: false as const, error: "Equipo no encontrado" };
    const { ctx } = await requireTournamentEditor(team.category.tournamentId);

    const count = await db.player.count({ where: { teamId } });
    if (count + players.length > 100) {
      return { success: false as const, error: "Nómina demasiado grande" };
    }

    const result = await db.player.createMany({
      data: players.map((p) => ({
        teamId,
        name: p.name,
        jerseyNumber: p.jerseyNumber ?? null,
        position: p.position ?? null,
        document: p.document ?? null,
      })),
      skipDuplicates: true,
    });
    await auditLog({
      userId: ctx.userId,
      tournamentId: team.category.tournamentId,
      action: "PLAYERS_BULK",
      entity: "Team",
      entityId: teamId,
      details: { count: result.count },
    });
    revalidatePath(`/panel/campeonatos/${team.category.tournamentId}`);
    return ok({ count: result.count });
  } catch (error) {
    return safeResult(error);
  }
}