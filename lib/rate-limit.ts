import { db } from "@/lib/db";

/**
 * Limitador de peticiones basado en BD (sin Redis).
 * Funciona para acciones con poco volumen (autenticación, formularios públicos).
 * En Vercel serverless cada función es efímera, por lo que la BD es la fuente de verdad.
 */
export async function rateLimit(ip: string, action: string, opts?: { max?: number; windowMs?: number }) {
  const max = opts?.max ?? 5;
  const windowMs = opts?.windowMs ?? 60 * 1000;

  const since = new Date(Date.now() - windowMs);
  const [count, all, oldest] = await Promise.all([
    db.rateLimit.count({ where: { ip, action, createdAt: { gte: since } } }),
    db.rateLimit.count({ where: { ip, action } }),
    db.rateLimit.findFirst({ where: { ip, action }, orderBy: { createdAt: "asc" } }),
  ]);

  if (count >= max) {
    return { limited: true as const, retryAfterMs: 0 };
  }

  // Poda: mantener máx 200 filas por ip+action
  if (all > 200 && oldest) {
    await db.rateLimit.deleteMany({ where: { id: oldest.id } });
  }

  await db.rateLimit.create({ data: { ip, action } });

  return { limited: false as const };
}

export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}