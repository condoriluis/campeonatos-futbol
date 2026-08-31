"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { registerSchema, userCreateSchema, userUpdateSchema } from "@/lib/validations/auth";
import { getSessionContext, requireContext, ok, safeResult } from "@/lib/actions/helpers";
import { auditLog } from "@/lib/audit";

export async function getCurrentUser() {
  const session = await getSessionContext();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, image: true, isActive: true },
  });
  return user;
}

export async function hasUsers() {
  const count = await db.user.count();
  return count > 0;
}

/** Registra el primer usuario del sistema (se convierte en ADMIN) */
export async function registerUser(input: unknown) {
  try {
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    const { name, email, password } = parsed.data;

    const count = await db.user.count();
    if (count > 0) return { success: false as const, error: "El sistema ya tiene un administrador" };

    const exists = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) return { success: false as const, error: "El email ya está registrado" };

    const hashed = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: { name, email: email.toLowerCase(), password: hashed, role: "ADMIN" },
      select: { id: true, name: true, email: true, role: true },
    });
    await auditLog({ userId: user.id, action: "USER_REGISTERED", entity: "User", entityId: user.id });
    return ok(user);
  } catch (error) {
    return safeResult(error);
  }
}

// ============ ADMIN: gestión de usuarios ============

export async function listUsers() {
  try {
    await requireContext("ADMIN");
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { matchOperators: true } },
      },
    });
    return users;
  } catch {
    return [];
  }
}

export async function createUser(input: unknown) {
  try {
    const ctx = await requireContext("ADMIN");
    const parsed = userCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    const { name, email, password, role } = parsed.data;
    const exists = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) return { success: false as const, error: "El email ya está registrado" };
    const hashed = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: { name, email: email.toLowerCase(), password: hashed, role },
      select: { id: true, name: true, email: true, role: true },
    });
    await auditLog({
      userId: ctx.userId,
      action: "USER_CREATED",
      entity: "User",
      entityId: user.id,
      details: { role },
    });
    return ok(user);
  } catch (error) {
    return safeResult(error);
  }
}

export async function updateUser(input: unknown) {
  try {
    const ctx = await requireContext("ADMIN");
    const parsed = userUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }
    const { id, password, ...rest } = parsed.data;
    if (id === ctx.userId && "isActive" in rest && rest.isActive === false) {
      return { success: false as const, error: "No puedes desactivarte a ti mismo" };
    }
    const data: Record<string, unknown> = { ...rest };
    if (rest.email) data.email = (rest.email as string).toLowerCase();
    if (password && password !== "") data.password = await bcrypt.hash(password as string, 12);

    const user = await db.user.update({ where: { id }, data: data as never });
    await auditLog({ userId: ctx.userId, action: "USER_UPDATED", entity: "User", entityId: id });
    return ok(user);
  } catch (error) {
    return safeResult(error);
  }
}

export async function deleteUser(id: string) {
  try {
    const ctx = await requireContext("ADMIN");
    if (id === ctx.userId) return { success: false as const, error: "No puedes eliminarte a ti mismo" };
    await db.user.delete({ where: { id } });
    await auditLog({ userId: ctx.userId, action: "USER_DELETED", entity: "User", entityId: id });
    return ok();
  } catch (error) {
    return safeResult(error);
  }
}

/** Lista operadores disponibles para asignar a un partido */
export async function listOperators() {
  try {
    await requireContext("ADMIN", "ORGANIZADOR");
    return await db.user.findMany({
      where: { role: { in: ["OPERADOR", "ORGANIZADOR"] }, isActive: true },
      select: { id: true, name: true, role: true, email: true },
      orderBy: { name: "asc" },
    });
  } catch {
    return [];
  }
}