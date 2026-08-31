export type ScheduledMatch = {
  home: string;
  away: string;
  jornada: number;
  order: number;
  scheduledAt: Date | null;
  venue: string | null;
};

type SchedulerOptions = {
  venues?: string[];
  startDate?: Date | null;
  startTime?: string | null; // "HH:MM"
  gapMinutes?: number;
  matchesPerVenuePerSlot?: number;
};

const DEFAULT_GAP_MS = 60 * 60 * 1000;

/**
 * Programa partidos de una jornada asignando cancha y hora.
 * Evita que dos partidos usen la misma cancha al mismo tiempo.
 * (La estructura round-robin garantiza que un equipo no juegue 2 partidos
 * en la misma jornada.)
 */
export function scheduleMatches(
  rounds: { home: string; away: string }[][],
  options: SchedulerOptions = {}
): ScheduledMatch[] {
  const venues = options.venues?.filter(Boolean) ?? ["Cancha 1"];
  const gapMs = (options.gapMinutes ?? 60) * 60 * 1000 || DEFAULT_GAP_MS;
  const baseDate = options.startDate ? new Date(options.startDate) : new Date();

  const startDate = startOfDay(baseDate);
  if (options.startTime) {
    const [h, m] = options.startTime.split(":").map(Number);
    startDate.setHours(h || 8, m || 0, 0, 0);
  } else {
    startDate.setHours(8, 0, 0, 0);
  }

  const result: ScheduledMatch[] = [];
  let order = 0;

  rounds.forEach((round, ri) => {
    const jornada = ri + 1;
    round.forEach((match, mi) => {
      // Cada cancha tiene su propio reloj de slots consecutivos (para "1 día, varias canchas")
      const venueIndex = mi % venues.length;
      const slot = Math.floor(mi / venues.length);
      const scheduledAt = new Date(startDate.getTime() + slot * gapMs);
      result.push({
        home: match.home,
        away: match.away,
        jornada,
        order,
        scheduledAt,
        venue: venues[venueIndex] ?? null,
      });
      order++;
    });
  });

  return result;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Distribuye partidos de llaves en rondas, asignando cancha/hora.
 */
export function scheduleKnockout(ties: { order: number; legIndex: number }[], options: SchedulerOptions = {}) {
  const venues = options.venues?.filter(Boolean) ?? ["Cancha 1"];
  const gapMs = (options.gapMinutes ?? 60) * 60 * 1000 || DEFAULT_GAP_MS;
  const startDate = startOfDay(options.startDate ? new Date(options.startDate) : new Date());
  if (options.startTime) {
    const [h, m] = options.startTime.split(":").map(Number);
    startDate.setHours(h || 8, m || 0, 0, 0);
  } else {
    startDate.setHours(8, 0, 0, 0);
  }

  return ties.map((tie, idx) => {
    const venueIndex = idx % venues.length;
    const slot = Math.floor(idx / venues.length);
    return {
      ...tie,
      scheduledAt: new Date(startDate.getTime() + slot * gapMs),
      venue: venues[venueIndex] ?? null,
    };
  });
}