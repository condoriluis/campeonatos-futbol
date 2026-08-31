import { z } from "zod";

export const tournamentSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres").max(120),
  sport: z.enum(["FUTBOL", "FUTSAL", "MINIFUTBOL", "OTRO"]).optional(),
  description: z.string().max(1000).optional().nullable(),
  logoUrl: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  venue: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  status: z
    .enum(["BORRADOR", "INSCRIPCION", "EN_PROGRESO", "FINALIZADO", "CANCELADO"])
    .optional(),
});
export type TournamentInput = z.infer<typeof tournamentSchema>;

export const tournamentStatusSchema = z.object({
  status: z.enum(["BORRADOR", "INSCRIPCION", "EN_PROGRESO", "FINALIZADO", "CANCELADO"]),
});
export type TournamentStatusInput = z.infer<typeof tournamentStatusSchema>;

export const rulesSchema = z.object({
  durationMinutes: z.coerce.number().int().min(1).max(180).default(40),
  breakMinutes: z.coerce.number().int().min(0).max(60).default(10),
  overtimeEnabled: z.boolean().default(false),
  overtimeMinutes: z.coerce.number().int().min(0).max(30).default(10),
  pointsWin: z.coerce.number().int().min(1).max(10).default(3),
  pointsDraw: z.coerce.number().int().min(0).max(5).default(1),
  pointsLoss: z.coerce.number().int().min(0).max(5).default(0),
  penaltiesEnabled: z.boolean().default(true),
  penaltiesOvertime: z.boolean().default(true),
  penaltiesCount: z.coerce.number().int().min(1).max(20).default(5),
  substitutesCount: z.coerce.number().int().min(0).max(15).default(5),
  minPlayers: z.coerce.number().int().min(1).max(30).default(6),
  maxPlayers: z.coerce.number().int().min(1).max(40).default(15),
  cardsRules: z.string().max(1000).optional().nullable(),
  tiebreakers: z
    .array(z.enum(["PUNTOS", "MUTUO", "DG", "GF", "GC", "MENOS_TARJETAS", "GOLES_VISITA", "SORTEO"]))
    .default(["PUNTOS", "MUTUO", "DG", "GF"]),
});
export type RulesInput = z.infer<typeof rulesSchema>;