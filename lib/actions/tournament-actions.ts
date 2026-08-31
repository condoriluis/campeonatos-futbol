"use server";

import { db } from "@/lib/db";
import { tournamentSchema, tournamentStatusSchema } from "@/lib/validations/tournament";
import { requireContext, requireTournamentEditor, ok, safeResult } from "@/lib/actions/helpers";
import { auditLog } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { revalidatePath } from "next/cache";

// ============ Lectura ============

export async function getTournamentsForUser() {
  const ctx = await requireContext("ADMIN", "ORGANIZADOR", "OPERADOR");
  const tournaments = await db.tournament.findMany({
    where: ctx.role === "OPERADOR" ? {} : ctx.role === "ADMIN" ? {} : { ownerId: ctx.userId },
    include: {
      _count: { select: { categories: true } },
      categories: { include: { championTeam: { select: { id: true, name: true } } } },
      rules: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return tournaments;
}

export async function getTournamentBySlug(slug: string) {
  return db.tournament.findUnique({
    where: { slug },
    include: {
      categories: {
        include: {
          _count: { select: { teams: true } },
          championTeam: { select: { id: true, name: true, color: true, shieldUrl: true } }
        },
        orderBy: { order: "asc" },
      },
      rules: true,
      owner: { select: { id: true, name: true } },
    },
  });
}

export async function getTournamentById(id: string) {
  return db.tournament.findUnique({ where: { id } });
}

/** Lista torneos públicos (visible en landing y como espectador) */
export async function getPublicTournaments() {
  return db.tournament.findMany({
    where: { status: { in: ["INSCRIPCION", "EN_PROGRESO", "FINALIZADO"] } },
    include: {
      _count: { select: { categories: true } },
      categories: { include: { championTeam: { select: { id: true, name: true, color: true, shieldUrl: true } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 24,
  });
}

// ============ Escritura ============

export async function createTournament(input: unknown) {
  try {
    const ctx = await requireContext("ADMIN", "ORGANIZADOR");
    const parsed = tournamentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    const { name, status, ...rest } = parsed.data;

    let slug = slugify(name);
    const base = slug;
    let n = 1;
    while (await db.tournament.findUnique({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }

    const tournament = await db.tournament.create({
      data: {
        name,
        slug,
        status: status ?? "BORRADOR",
        ownerId: ctx.userId,
        ...rest,
        rules: { create: {} },
      },
      select: { id: true, slug: true, name: true },
    });

    await auditLog({
      userId: ctx.userId,
      tournamentId: tournament.id,
      action: "TOURNAMENT_CREATED",
      entity: "Tournament",
      entityId: tournament.id,
    });
    revalidatePath("/panel");
    return ok({ ...tournament, slug });
  } catch (error) {
    return safeResult(error);
  }
}

export async function updateTournament(id: string, input: unknown) {
  try {
    const { ctx, tournament } = await requireTournamentEditor(id);
    const parsed = tournamentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    const { name, status, ...rest } = parsed.data;

    // No permitir modificar datos estructurales de un torneo iniciado sin confirmar
    const data: Record<string, unknown> = { ...rest };
    if (name && name !== tournament.name) data.name = name;

    const updated = await db.tournament.update({
      where: { id },
      data: {
        ...data,
        ...(status && tournament.status !== status ? { status } : {}),
      },
    });

    await auditLog({
      userId: ctx.userId,
      tournamentId: id,
      action: "TOURNAMENT_UPDATED",
      entity: "Tournament",
      entityId: id,
      details: { changes: data },
    });
    revalidatePath(`/panel/campeonatos/${id}`);
    return ok(updated);
  } catch (error) {
    return safeResult(error);
  }
}

export async function changeTournamentStatus(id: string, input: unknown) {
  try {
    const { ctx } = await requireTournamentEditor(id);
    const parsed = tournamentStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: "Estado inválido" };
    }
    const updated = await db.tournament.update({
      where: { id },
      data: { status: parsed.data.status },
    });
    await auditLog({
      userId: ctx.userId,
      tournamentId: id,
      action: "TOURNAMENT_STATUS",
      entity: "Tournament",
      entityId: id,
      details: { status: parsed.data.status },
    });
    revalidatePath(`/panel/campeonatos/${id}`);
    return ok(updated);
  } catch (error) {
    return safeResult(error);
  }
}

export async function deleteTournament(id: string) {
  try {
    const { ctx } = await requireTournamentEditor(id);
    await db.tournament.delete({ where: { id } });
    await auditLog({
      userId: ctx.userId,
      action: "TOURNAMENT_DELETED",
      entity: "Tournament",
      entityId: id,
    });
    revalidatePath("/panel");
    return ok();
  } catch (error) {
    return safeResult(error);
  }
}

/** Asigna el campeón visible de la categoría */
export async function setCategoryChampion(id: string, categoryId: string, championTeamId: string | null) {
  try {
    const { ctx } = await requireTournamentEditor(id);
    const updated = await db.category.update({
      where: { id: categoryId },
      data: { championTeamId },
    });
    await auditLog({
      userId: ctx.userId,
      tournamentId: id,
      action: "CATEGORY_CHAMPION",
      entity: "Category",
      entityId: categoryId,
      details: { championTeamId },
    });
    revalidatePath(`/panel/campeonatos/${id}`);
    return ok(updated);
  } catch (error) {
    return safeResult(error);
  }
}