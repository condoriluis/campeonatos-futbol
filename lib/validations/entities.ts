import { z } from "zod";

export const categorySchema = z.object({
  tournamentId: z.string(),
  name: z.string().min(1, "El nombre es obligatorio").max(60),
  type: z.enum(["VARONES", "DAMAS", "MIXTO", "PERSONALIZADA"]),
  color: z.string().max(20).optional().nullable(),
  maxTeams: z.coerce.number().int().min(0).max(500).optional().nullable(),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const teamSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(2, "El nombre del equipo es obligatorio").max(80),
  shieldUrl: z.string().url().optional().nullable().or(z.literal("")),
  color: z.string().max(20).optional().nullable(),
  delegateName: z.string().max(80).optional().nullable(),
  captainName: z.string().max(80).optional().nullable(),
  status: z.enum(["PENDIENTE", "ACTIVO", "SUSPENDIDO", "RETIRADO", "DESCALIFICADO"]).optional(),
});
export type TeamInput = z.infer<typeof teamSchema>;

export const playerSchema = z.object({
  teamId: z.string(),
  name: z.string().min(2, "El nombre del jugador es obligatorio").max(80),
  jerseyNumber: z.coerce.number().int().min(0).max(99).optional().nullable(),
  position: z.string().max(20).optional().nullable(),
  document: z.string().max(30).optional().nullable(),
  status: z.enum(["HABILITADO", "INHABILITADO"]).optional(),
  isCaptain: z.boolean().optional(),
});
export type PlayerInput = z.infer<typeof playerSchema>;

export const bulkPlayersSchema = z.object({
  teamId: z.string(),
  players: z
    .array(
      z.object({
        name: z.string().min(2),
        jerseyNumber: z.coerce.number().int().min(0).max(99).optional().nullable(),
        position: z.string().max(20).optional().nullable(),
        document: z.string().max(30).optional().nullable(),
      })
    )
    .min(1, "Ingresa al menos un jugador"),
});
export type BulkPlayersInput = z.infer<typeof bulkPlayersSchema>;