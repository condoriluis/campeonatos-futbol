import type { Tiebreaker } from "@prisma/client";
import type { MatchScoreInput, StandingRow, StandingsResult } from "@/lib/engine/types";

export type CardStats = Map<string, { yellow: number; red: number }>;

/**
 * Calcula la tabla de posiciones a partir de los marcadores.
 * Aplica criterios de desempate configurables (reglamento).
 */
export function computeStandings(
  matches: MatchScoreInput[],
  teams: { id: string; name: string; color?: string | null; shieldUrl?: string | null }[],
  opts: {
    pointsWin?: number;
    pointsDraw?: number;
    pointsLoss?: number;
    tiebreakers?: Tiebreaker[];
    cards?: CardStats;
  } = {}
): StandingsResult {
  const pointsWin = opts.pointsWin ?? 3;
  const pointsDraw = opts.pointsDraw ?? 1;
  const pointsLoss = opts.pointsLoss ?? 0;
  const tiebreakers = opts.tiebreakers ?? ["PUNTOS", "MUTUO", "DG", "GF"];

  const finished = matches.filter((m) => m.status === "FINALIZADO");

  const base = new Map<string, StandingRow>();
  for (const t of teams) {
    base.set(t.id, {
      teamId: t.id,
      teamName: t.name,
      teamColor: t.color,
      shieldUrl: t.shieldUrl,
      position: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
      yellowCards: 0,
      redCards: 0,
    });
  }

  for (const m of finished) {
    if (m.homeScore == null || m.awayScore == null) continue;
    if (!m.homeTeamId || !m.awayTeamId) continue;

    const home = base.get(m.homeTeamId);
    const away = base.get(m.awayTeamId);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won++;
      away.lost++;
      home.points += pointsWin;
      away.points += pointsLoss;
    } else if (m.homeScore < m.awayScore) {
      away.won++;
      home.lost++;
      away.points += pointsWin;
      home.points += pointsLoss;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += pointsDraw;
      away.points += pointsDraw;
    }
  }

  for (const t of teams) {
    const row = base.get(t.id)!;
    row.goalDiff = row.goalsFor - row.goalsAgainst;
    const cards = opts.cards?.get(t.id);
    if (cards) {
      row.yellowCards = cards.yellow;
      row.redCards = cards.red;
    }
  }

  const rows = Array.from(base.values());
  const order = tiebreakSort(rows, tiebreakers, finished);

  const rowById = new Map(rows.map((r) => [r.teamId, r]));
  order.forEach((teamId, idx) => {
    const row = rowById.get(teamId);
    if (row) row.position = idx + 1;
  });

  rows.sort((a, b) => a.position - b.position);

  return { rows, order };
}

/** Ordena ids de equipos aplicando criterios de desempate en orden */
function tiebreakSort(
  rows: StandingRow[],
  tiebreakers: Tiebreaker[],
  allMatches: MatchScoreInput[]
): string[] {
  if (rows.length <= 1) return rows.map((r) => r.teamId);

  const sorted = [...rows].sort((a, b) => b.points - a.points);

  // Agrupar por puntos
  const groups: StandingRow[][] = [];
  for (const row of sorted) {
    const last = groups[groups.length - 1];
    if (last && last[0].points === row.points) last.push(row);
    else groups.push([row]);
  }

  const finalOrder: string[] = [];
  for (const group of groups) {
    if (group.length === 1) {
      finalOrder.push(group[0].teamId);
      continue;
    }
    finalOrder.push(...resolveGroup(group, tiebreakers, allMatches));
  }
  return finalOrder;
}

function resolveGroup(
  rows: StandingRow[],
  tiebreakers: Tiebreaker[],
  allMatches: MatchScoreInput[]
): string[] {
  let current = [...rows];

  for (const tb of tiebreakers) {
    if (current.length <= 1) break;
    if (tb === "SORTEO") {
      current.sort((a, b) => a.teamName.localeCompare(b.teamName, "es"));
      break;
    }
    if (tb === "MUTUO") {
      current = resolveHeadToHead(current, allMatches);
      continue;
    }
    sortByTiebreaker(current, tb, allMatches);
    current = regroupClusters(current);
  }

  return current.map((r) => r.teamId);
}

function sortByTiebreaker(current: StandingRow[], tb: Tiebreaker, allMatches: MatchScoreInput[]) {
  switch (tb) {
    case "DG":
      current.sort((a, b) => b.goalDiff - a.goalDiff);
      break;
    case "GF":
      current.sort((a, b) => b.goalsFor - a.goalsFor);
      break;
    case "GC":
      current.sort((a, b) => a.goalsAgainst - b.goalsAgainst);
      break;
    case "MENOS_TARJETAS":
      current.sort(
        (a, b) => a.yellowCards + a.redCards * 2 - (b.yellowCards + b.redCards * 2)
      );
      break;
    case "PUNTOS":
      current.sort((a, b) => b.points - a.points);
      break;
    case "GOLES_VISITA":
      current.sort((a, b) => awayGoalsFor(b, allMatches) - awayGoalsFor(a, allMatches));
      break;
    default:
      break;
  }
}

/** Regrupa en subgrupos que siguen empatados tras aplicar un criterio */
function regroupClusters(current: StandingRow[]): StandingRow[] {
  const key = (r: StandingRow) =>
    [r.points, r.goalDiff, r.goalsFor, r.goalsAgainst, r.yellowCards + r.redCards * 2].join(":");
  const groups: StandingRow[][] = [];
  for (const row of current) {
    const last = groups[groups.length - 1];
    if (last && key(last[0]) === key(row)) last.push(row);
    else groups.push([row]);
  }
  return groups.flat();
}

function resolveHeadToHead(rows: StandingRow[], allMatches: MatchScoreInput[]): StandingRow[] {
  if (rows.length !== 2) return rows;
  const [a, b] = rows;
  const matches = allMatches.filter(
    (m) =>
      m.status === "FINALIZADO" &&
      ((m.homeTeamId === a.teamId && m.awayTeamId === b.teamId) ||
        (m.homeTeamId === b.teamId && m.awayTeamId === a.teamId))
  );
  if (matches.length === 0) return rows;

  let aPts = 0;
  let aGf = 0;
  let bPts = 0;
  let bGf = 0;
  for (const m of matches) {
    if (m.homeScore == null || m.awayScore == null) continue;
    if (m.homeTeamId === a.teamId) {
      aGf += m.homeScore;
      bGf += m.awayScore;
      if (m.homeScore > m.awayScore) aPts += 3;
      else if (m.homeScore < m.awayScore) bPts += 3;
      else {
        aPts += 1;
        bPts += 1;
      }
    } else {
      aGf += m.awayScore;
      bGf += m.homeScore;
      if (m.awayScore > m.homeScore) aPts += 3;
      else if (m.awayScore < m.homeScore) bPts += 3;
      else {
        aPts += 1;
        bPts += 1;
      }
    }
  }
  void aGf;
  void bGf;
  return aPts !== bPts ? (aPts > bPts ? [a, b] : [b, a]) : rows;
}

function awayGoalsFor(row: StandingRow, allMatches: MatchScoreInput[]): number {
  let goals = 0;
  for (const m of allMatches) {
    if (m.status !== "FINALIZADO" || m.homeScore == null || m.awayScore == null) continue;
    if (m.awayTeamId === row.teamId) goals += m.awayScore;
  }
  return goals;
}

/** Agrupa tarjetas por equipo desde una lista de eventos */
export function aggregateCards(events: { type: string; teamId: string | null }[]): CardStats {
  const map: CardStats = new Map();
  for (const ev of events) {
    if (!ev.teamId) continue;
    if (ev.type !== "AMARILLA" && ev.type !== "ROJA") continue;
    const entry = map.get(ev.teamId) ?? { yellow: 0, red: 0 };
    if (ev.type === "AMARILLA") entry.yellow++;
    else entry.red++;
    map.set(ev.teamId, entry);
  }
  return map;
}