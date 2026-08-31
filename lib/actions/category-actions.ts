"use server";

import { db } from "@/lib/db";
import { categorySchema } from "@/lib/validations/entities";
import { requireTournamentEditor, ok, safeResult } from "@/lib/actions/helpers";
import { auditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

function revalidateCat(categoryId: string) {
  revalidatePath(`/panel/campeonatos/${categoryId}`);
}

export async function createCategory(input: unknown) {
  try {
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    const { tournamentId, ...rest } = parsed.data;
    const { ctx, tournament } = await requireTournamentEditor(tournamentId);
    if (tournament.status !== "BORRADOR" && tournament.status !== "INSCRIPCION") {
      return { success: false as const, error: "El campeonato ya está en curso" };
    }
    const count = await db.category.count({ where: { tournamentId } });
    const category = await db.category.create({
      data: { ...rest, tournamentId, order: count },
    });
    await auditLog({
      userId: ctx.userId,
      tournamentId,
      action: "CATEGORY_CREATED",
      entity: "Category",
      entityId: category.id,
      details: { name: rest.name },
    });
    revalidateCat(tournamentId);
    return ok(category);
  } catch (error) {
    return safeResult(error);
  }
}

export async function updateCategory(id: string, input: unknown) {
  try {
    const category = await db.category.findUnique({ where: { id }, include: { tournament: true } });
    if (!category) return { success: false as const, error: "Categoría no encontrada" };
    const parsed = categorySchema.safeParse({ ...(input as object), tournamentId: category.tournamentId });
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    const { ctx, tournament } = await requireTournamentEditor(category.tournamentId);
    if (tournament.status !== "BORRADOR" && tournament.status !== "INSCRIPCION") {
      return { success: false as const, error: "El campeonato ya está en curso" };
    }
    const updated = await db.category.update({ where: { id }, data: parsed.data });
    await auditLog({
      userId: ctx.userId,
      tournamentId: category.tournamentId,
      action: "CATEGORY_UPDATED",
      entity: "Category",
      entityId: id,
    });
    revalidateCat(category.tournamentId);
    return ok(updated);
  } catch (error) {
    return safeResult(error);
  }
}

export async function deleteCategory(id: string) {
  try {
    const category = await db.category.findUnique({
      where: { id },
      include: { tournament: true, _count: { select: { teams: true, matches: true } } },
    });
    if (!category) return { success: false as const, error: "Categoría no encontrada" };
    const { ctx, tournament } = await requireTournamentEditor(category.tournamentId);
    if (tournament.status !== "BORRADOR" && tournament.status !== "INSCRIPCION") {
      return { success: false as const, error: "El campeonato ya está en curso" };
    }
    if (category._count.teams > 0 || category._count.matches > 0) {
      return { success: false as const, error: "No se puede eliminar: tiene equipos o partidos" };
    }
    await db.category.delete({ where: { id } });
    await auditLog({
      userId: ctx.userId,
      tournamentId: category.tournamentId,
      action: "CATEGORY_DELETED",
      entity: "Category",
      entityId: id,
    });
    revalidateCat(category.tournamentId);
    return ok();
  } catch (error) {
    return safeResult(error);
  }
}

export async function getCategoriesWithTeams(tournamentId: string) {
  try {
    const ctx = await requireTournamentEditor(tournamentId);
    const categories = await db.category.findMany({
      where: { tournamentId },
      include: {
        teams: {
          where: { status: { not: "RETIRADO" } },
          include: { _count: { select: { players: true } } },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });
    void ctx;
    return categories;
  } catch {
    return [];
  }
}