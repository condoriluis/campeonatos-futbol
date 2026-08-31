import { auth } from "@/lib/auth";

export type Role = "ADMIN" | "ORGANIZADOR" | "OPERADOR";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  ORGANIZADOR: "Organizador",
  OPERADOR: "Operador / Mesa",
};

export function roleLabel(role: Role) {
  return ROLE_LABELS[role];
}

export function hasRole(userRole: string | undefined, required: Role[]) {
  if (!userRole) return false;
  return required.includes(userRole as Role);
}

/** Devuelve el usuario autenticado o lanza error si no cumple el/los roles */
export async function requireRole(...roles: Role[]) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id) {
    throw new Error("No autenticado");
  }
  if (!hasRole(role, roles)) {
    throw new Error("No tienes permisos para esta acción");
  }
  return { user: session.user, session };
}

export async function getSessionRole() {
  const session = await auth();
  return {
    userId: session?.user?.id ?? null,
    role: (session?.user?.role ?? null) as Role | null,
  };
}

/** ADMIN tiene prioridad sobre cualquier regla de negocio */
export function isAdmin(role: Role | null | undefined) {
  return role === "ADMIN";
}

/**
 * Permite acción si el usuario es ADMIN u ORGANIZADOR (y opcionalmente dueño del torneo).
 * Devuelve true/false, no lanza.
 */
export function canManageTournament(role: Role | null | undefined, isOwner: boolean) {
  if (!role) return false;
  if (isAdmin(role)) return true;
  return role === "ORGANIZADOR" && isOwner;
}

export function canOperateMatch(role: Role | null | undefined) {
  if (!role) return false;
  return isAdmin(role) || role === "ORGANIZADOR" || role === "OPERADOR";
}