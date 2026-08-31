import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canManageTournament, type Role } from "@/lib/permissions";

export type SessionContext = {
  userId: string;
  role: Role;
};

export async function getSessionContext(): Promise<SessionContext | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return null;
  return { userId: session.user.id, role: session.user.role as Role };
}

/** Exige un contexto autenticado con alguno de los roles indicados */
export async function requireContext(...roles: Role[]): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) throw new Error("No autenticado");
  if (roles.length && !roles.includes(ctx.role)) {
    throw new Error("No tienes permisos para esta acción");
  }
  return ctx;
}

/**
 * Valida que el usuario pueda editar el torneo (ADMIN o dueño ORGANIZADOR).
 */
export async function requireTournamentEditor(tournamentId: string) {
  const ctx = await requireContext("ADMIN", "ORGANIZADOR");
  const tournament = await db.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new Error("Campeonato no encontrado");
  const isOwner = tournament.ownerId === ctx.userId;
  if (!canManageTournament(ctx.role, isOwner)) {
    throw new Error("No tienes permisos sobre este campeonato");
  }
  return { ctx, tournament, isOwner };
}

/** Valida acceso OPERADOR a un partido (asignado o rol superior) */
export async function requireMatchOperator(matchId: string) {
  const ctx = await requireContext("ADMIN", "ORGANIZADOR", "OPERADOR");
  if (ctx.role === "OPERADOR") {
    const assignment = await db.matchOperator.findUnique({
      where: { matchId_userId: { matchId, userId: ctx.userId } },
    });
    const match = await db.match.findUnique({ where: { id: matchId } });
    if (!match) throw new Error("Partido no encontrado");
    if (!assignment) throw new Error("Este partido no está asignado a ti");
    return { ctx, match };
  }
  const match = await db.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error("Partido no encontrado");
  return { ctx, match };
}

/** Mapeo de errores comunes (Prisma + Zod) a mensajes amigables */
export function friendlyError(error: unknown, fallback = "Ocurrió un error inesperado") {
  if (error instanceof Error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002") return "Ya existe un registro con esos datos";
    if (code === "P2003") return "El registro está en uso por otros datos";
    if (code === "P2025") return "El registro no existe";
    return error.message;
  }
  return fallback;
}

export function safeResult(error: unknown, fallback = "Ocurrió un error inesperado") {
  return { success: false as const, error: friendlyError(error, fallback) };
}

export function ok<T>(data?: T, message?: string) {
  return { success: true as const, data, message };
}