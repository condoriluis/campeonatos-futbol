import { db } from "@/lib/db";

type AuditInput = {
  userId?: string | null;
  tournamentId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  details?: Record<string, unknown>;
};

/** Registra una acción critica en el log de auditoría. Nunca lanza errores. */
export async function auditLog({ userId, tournamentId, action, entity, entityId, details }: AuditInput) {
  try {
    await db.auditLog.create({
      data: {
        userId: userId ?? null,
        tournamentId: tournamentId ?? null,
        action,
        entity: entity ?? null,
        entityId: entityId ?? null,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
      },
    });
  } catch (error) {
    console.error("AuditLog error:", error);
  }
}