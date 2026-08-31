"use server";

import { db } from "@/lib/db";
import { rulesSchema } from "@/lib/validations/tournament";
import { requireTournamentEditor, ok, safeResult } from "@/lib/actions/helpers";
import { auditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function getRules(tournamentId: string) {
  return db.tournamentRules.findUnique({ where: { tournamentId } });
}

/** Guarda/actualiza el reglamento del campeonato */
export async function saveRules(tournamentId: string, input: unknown) {
  try {
    const { ctx } = await requireTournamentEditor(tournamentId);
    const parsed = rulesSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    const {
      durationMinutes,
      breakMinutes,
      overtimeEnabled,
      overtimeMinutes,
      pointsWin,
      pointsDraw,
      pointsLoss,
      penaltiesEnabled,
      penaltiesOvertime,
      penaltiesCount,
      substitutesCount,
      minPlayers,
      maxPlayers,
      cardsRules,
      tiebreakers,
    } = parsed.data;

    const rules = await db.tournamentRules.upsert({
      where: { tournamentId },
      create: { tournamentId, ...parsed.data },
      update: {
        durationMinutes,
        breakMinutes,
        overtimeEnabled,
        overtimeMinutes,
        pointsWin,
        pointsDraw,
        pointsLoss,
        penaltiesEnabled,
        penaltiesOvertime,
        penaltiesCount,
        substitutesCount,
        minPlayers,
        maxPlayers,
        cardsRules: cardsRules ?? null,
        tiebreakers,
      },
    });

    await auditLog({
      userId: ctx.userId,
      tournamentId,
      action: "RULES_UPDATED",
      entity: "TournamentRules",
      entityId: rules.id,
      details: { ...parsed.data },
    });
    revalidatePath(`/panel/campeonatos/${tournamentId}`);
    return ok(rules);
  } catch (error) {
    return safeResult(error);
  }
}