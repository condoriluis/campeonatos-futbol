import { z } from "zod";

export const createPhaseSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(2).max(80),
  type: z.enum(["GRUPOS", "LLAVES"]),
  fromPhaseId: z.string().optional().nullable(),
  config: z.record(z.string(), z.unknown()).optional(),
});
export type CreatePhaseInput = z.infer<typeof createPhaseSchema>;

/** Config de fase de GRUPOS */
export const groupsConfigSchema = z.object({
  groupCount: z.coerce.number().int().min(1).max(16),
  rounds: z.coerce.number().int().min(1).max(2).default(1),
  classifyPerGroup: z.coerce.number().int().min(0).max(8).default(2),
  bestThirds: z.coerce.number().int().min(0).max(8).default(0),
});
export type GroupsConfig = z.infer<typeof groupsConfigSchema>;

/** Config de fase de LLAVES */
export const knockoutConfigSchema = z.object({
  includeThirdPlace: z.boolean().default(true),
  leg: z.enum(["SIMPLE", "IDA_Y_VUELTA"]).default("SIMPLE"),
});
export type KnockoutConfig = z.infer<typeof knockoutConfigSchema>;

export const drawSchema = z.object({
  phaseId: z.string(),
  assignments: z.array(
    z.object({
      teamId: z.string(),
      groupId: z.string(),
      seed: z.coerce.number().int().min(0).optional().default(0),
    })
  ),
});
export type DrawInput = z.infer<typeof drawSchema>;

export const autoDrawSchema = z.object({
  phaseId: z.string(),
  seedsFirst: z.array(z.string()).optional(), // ids de equipos cabezas de serie
});
export type AutoDrawInput = z.infer<typeof autoDrawSchema>;

export const fixtureOptionsSchema = z.object({
  rounds: z.coerce.number().int().min(1).max(2).default(1),
  scheduledAt: z.coerce.date().optional().nullable(),
  venue: z.string().max(120).optional().nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida (HH:MM)").optional().nullable(),
  gapMinutes: z.coerce.number().int().min(0).max(600).default(60),
});
export type FixtureOptionsInput = z.infer<typeof fixtureOptionsSchema>;

export const matchScheduleSchema = z.object({
  matchId: z.string(),
  scheduledAt: z.coerce.date().optional().nullable(),
  venue: z.string().max(120).optional().nullable(),
});

export const manualResultSchema = z.object({
  matchId: z.string(),
  homeScore: z.coerce.number().int().min(0).max(99),
  awayScore: z.coerce.number().int().min(0).max(99),
  usePenalties: z.boolean().optional(),
  homePenalties: z.coerce.number().int().min(0).max(99).optional().nullable(),
  awayPenalties: z.coerce.number().int().min(0).max(99).optional().nullable(),
});

export const matchEventInputSchema = z.object({
  matchId: z.string(),
  teamId: z.string().optional().nullable(),
  playerId: z.string().optional().nullable(),
  type: z.enum(["GOL", "AMARILLA", "ROJA", "CAMBIO", "PAUSA", "REANUDAR", "INICIO", "FIN", "TARDE"]),
  minute: z.coerce.number().int().min(0).max(180).optional().nullable(),
  note: z.string().max(200).optional().nullable(),
});
export type MatchEventInput = z.infer<typeof matchEventInputSchema>;

export const penaltyShotSchema = z.object({
  matchId: z.string(),
  teamId: z.string(),
  playerId: z.string().optional().nullable(),
  result: z.enum(["CONVERTIDO", "FALLADO"]),
});
export type PenaltyShotInput = z.infer<typeof penaltyShotSchema>;

export const assignOperatorSchema = z.object({
  matchId: z.string(),
  userId: z.string(),
  assigned: z.boolean(),
});