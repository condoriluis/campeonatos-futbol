"use server";

import { db } from "@/lib/db";
import { requireTournamentEditor, ok, safeResult } from "@/lib/actions/helpers";
import { playerSchema } from "@/lib/validations/entities";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { randomInt } from "crypto";

const COOKIE_PREFIX = "roster_access_";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24h

// ─── Panel: generar o regenerar token+PIN ───────────────────────────────────

export async function generateRosterAccess(teamId: string) {
  try {
    const team = await db.team.findUnique({ where: { id: teamId }, include: { category: true } });
    if (!team) return { success: false as const, error: "Equipo no encontrado" };
    await requireTournamentEditor(team.category.tournamentId);

    const pin = String(randomInt(1000, 9999 + 1)).padStart(4, "0");
    const { randomUUID } = await import("crypto");
    const token = randomUUID();

    await db.team.update({ where: { id: teamId }, data: { rosterToken: token, rosterPin: pin } });
    revalidatePath(`/panel/campeonatos/${team.category.tournamentId}/equipos/${teamId}`);
    return ok({ token, pin });
  } catch (error) {
    return safeResult(error);
  }
}

// ─── Público: verificar PIN y emitir cookie ─────────────────────────────────

export async function verifyRosterPin(token: string, pin: string) {
  try {
    // Rate limit: max 5 attempts per token per 10 minutes
    const windowMs = 10 * 60 * 1000;
    const cutoff = new Date(Date.now() - windowMs);
    const attempts = await db.rateLimit.count({
      where: { ip: `roster:${token}`, action: "PIN_ATTEMPT", createdAt: { gte: cutoff } },
    });
    if (attempts >= 5) {
      return { success: false as const, error: "Demasiados intentos. Espera 10 minutos." };
    }
    await db.rateLimit.create({ data: { ip: `roster:${token}`, action: "PIN_ATTEMPT" } });

    const team = await db.team.findUnique({
      where: { rosterToken: token },
      select: { id: true, name: true, rosterPin: true },
    });
    if (!team || !team.rosterPin) {
      return { success: false as const, error: "Enlace inválido o sin acceso generado." };
    }
    if (team.rosterPin !== pin.trim()) {
      return { success: false as const, error: "PIN incorrecto." };
    }

    // Set HTTP-only cookie
    const jar = await cookies();
    jar.set(`${COOKIE_PREFIX}${token}`, team.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: `/nomina/${token}`,
    });

    return ok({ teamId: team.id, teamName: team.name });
  } catch (error) {
    return safeResult(error);
  }
}

// ─── Público: verificar que la cookie es válida para este token ──────────────

export async function getRosterSession(token: string): Promise<{ teamId: string; teamName: string; tournament: string; category: string } | null> {
  const jar = await cookies();
  const cookieVal = jar.get(`${COOKIE_PREFIX}${token}`)?.value;
  if (!cookieVal) return null;

  const team = await db.team.findUnique({
    where: { id: cookieVal, rosterToken: token },
    select: {
      id: true,
      name: true,
      category: {
        select: {
          name: true,
          tournament: { select: { name: true } },
        },
      },
    },
  });
  if (!team) return null;

  return {
    teamId: team.id,
    teamName: team.name,
    tournament: team.category.tournament.name,
    category: team.category.name,
  };
}

// ─── Público: acciones de jugador sin login (solo con cookie válida) ─────────

async function requireRosterSession(token: string) {
  const session = await getRosterSession(token);
  if (!session) throw new Error("Acceso no autorizado");
  return session;
}

export async function rosterGetPlayers(token: string) {
  const session = await getRosterSession(token);
  if (!session) return [];
  return db.player.findMany({
    where: { teamId: session.teamId },
    orderBy: [{ jerseyNumber: "asc" }, { name: "asc" }],
    select: { id: true, name: true, jerseyNumber: true, position: true, document: true, isCaptain: true, status: true },
  });
}

export async function rosterCreatePlayer(token: string, input: unknown) {
  try {
    const session = await requireRosterSession(token);
    const parsed = playerSchema.safeParse({ ...(input as object), teamId: session.teamId });
    if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    const player = await db.player.create({ data: parsed.data });
    revalidatePath(`/nomina/${token}`);
    return ok(player);
  } catch (error) {
    return safeResult(error);
  }
}

export async function rosterUpdatePlayer(token: string, playerId: string, input: unknown) {
  try {
    const session = await requireRosterSession(token);
    // Ensure the player belongs to this team
    const existing = await db.player.findUnique({ where: { id: playerId } });
    if (!existing || existing.teamId !== session.teamId) {
      return { success: false as const, error: "Jugador no encontrado" };
    }
    const parsed = playerSchema.safeParse({ ...(input as object), teamId: session.teamId });
    if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    const updated = await db.player.update({ where: { id: playerId }, data: parsed.data });
    revalidatePath(`/nomina/${token}`);
    return ok(updated);
  } catch (error) {
    return safeResult(error);
  }
}

export async function rosterDeletePlayer(token: string, playerId: string) {
  try {
    const session = await requireRosterSession(token);
    const existing = await db.player.findUnique({ where: { id: playerId } });
    if (!existing || existing.teamId !== session.teamId) {
      return { success: false as const, error: "Jugador no encontrado" };
    }
    await db.player.delete({ where: { id: playerId } });
    revalidatePath(`/nomina/${token}`);
    return ok();
  } catch (error) {
    return safeResult(error);
  }
}
