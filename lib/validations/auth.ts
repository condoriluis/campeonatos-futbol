import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres").max(80),
  email: z.email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const userCreateSchema = z.object({
  name: z.string().min(3).max(80),
  email: z.email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
  role: z.enum(["ADMIN", "ORGANIZADOR", "OPERADOR"]),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  id: z.string(),
  name: z.string().min(3).max(80).optional(),
  email: z.email().optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72).optional().or(z.literal("")),
  role: z.enum(["ADMIN", "ORGANIZADOR", "OPERADOR"]).optional(),
  isActive: z.boolean().optional(),
});
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;