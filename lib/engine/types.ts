import type { EventType, MatchStatus, Tiebreaker } from "@prisma/client";

/** Fila calculada de tabla de posiciones */
export type StandingRow = {
  teamId: string;
  teamName: string;
  teamColor?: string | null;
  shieldUrl?: string | null;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  yellowCards: number;
  redCards: number;
};

/** Input mínimo de un partido para cálculos de posiciones */
export type MatchScoreInput = {
  id: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  scheduledAt: Date | null;
  status: MatchStatus;
  categoryId: string;
  jornada: number | null;
  groupId: string | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  winnerId: string | null;
  events?: { playerId: string | null; type: EventType }[];
};

/** Resultado del cálculo de posiciones: filas + empates a resolver */
export type StandingsResult = {
  rows: StandingRow[];
  order: string[]; // ids de equipos ordenados (aplicando desempates)
};

export type Qualifier = {
  teamId: string;
  teamName: string;
  label?: string; // ej. "1A", "2B", "Mejor 3º"
  groupName?: string;
  seed?: number;
};

export type KnockoutMatchDraft = {
  round: number;
  order: number;
  homeTeamId?: string;
  awayTeamId?: string;
  homeLabel?: string;
  awayLabel?: string;
  homePreviousMatchRef?: { kickoff: number; index: number };
  awayPreviousMatchRef?: { kickoff: number; index: number };
};

export const TIEBREAKER_LABELS: Record<Tiebreaker, string> = {
  PUNTOS: "Puntos",
  MUTUO: "Resultado particular",
  DG: "Diferencia de gol",
  GF: "Goles a favor",
  GC: "Goles en contra",
  MENOS_TARJETAS: "Menos tarjetas",
  GOLES_VISITA: "Goles de visitante",
  SORTEO: "Sorteo",
};