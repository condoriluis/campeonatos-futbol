import type { Qualifier } from "@/lib/engine/types";

export type BracketFeedRef = {
  round: number;
  order: number;
  slot: "home" | "away" | "homeLoser" | "awayLoser";
  legIndex: number;
};

export type BracketMatchDraft = {
  round: number;
  order: number;
  legIndex: number; // 0 = primera (la que "alimenta"), 1 = vuelta
  homeTeamId?: string;
  awayTeamId?: string;
  homeLabel?: string;
  awayLabel?: string;
  homeFeedFrom?: BracketFeedRef;
  awayFeedFrom?: BracketFeedRef;
};

export type BracketDraft = {
  qualifiers: Qualifier[];
  totalRounds: number;
  slots: number;
  matches: BracketMatchDraft[];
};

function nextPowerOfTwo(n: number): { slots: number; rounds: number } {
  let slots = 1;
  let rounds = 0;
  while (slots < n) {
    slots *= 2;
    rounds++;
  }
  return { slots, rounds };
}

/**
 * Genera el cuadro de llaves (eliminación directa) a partir de clasificados ordenados.
 *
 * Empareja por "plegado": el 1° con el último, el 2° con el penúltimo, etc.,
 * de modo que los mejores se enfrenten recién en rondas finales.
 * Los byes avanzan automáticamente.
 */
export function generateBracket(
  qualifiers: Qualifier[],
  config: { includeThirdPlace?: boolean; leg?: "SIMPLE" | "IDA_Y_VUELTA" } = {}
): BracketDraft {
  const leg = config.leg ?? "SIMPLE";
  const includeThirdPlace = config.includeThirdPlace ?? true;
  const double = leg === "IDA_Y_VUELTA";

  const n = qualifiers.length;
  if (n < 2) {
    return { qualifiers, totalRounds: 0, slots: 0, matches: [] };
  }

  const { slots, rounds: totalRounds } = nextPowerOfTwo(n);
  const matches: BracketMatchDraft[] = [];

  const slotTeams: (Qualifier | null)[] = [];
  for (let i = 0; i < slots; i++) slotTeams.push(qualifiers[i] ?? null);

  // Primera ronda: emparejamiento plegado
  for (let i = 0; i < Math.floor(slots / 2); i++) {
    const home = slotTeams[i];
    const away = slotTeams[slots - 1 - i];

    if (home && away) {
      pushTie(matches, 1, i, home, away, double);
    } else if (home) {
      // bye
      pushMatch(matches, 1, i, 0, { homeTeamId: home.teamId, homeLabel: home.label ?? "Avanza" });
    } else if (away) {
      pushMatch(matches, 1, i, 0, { homeTeamId: away.teamId, awayLabel: away.label ?? "Avanza" });
    }
  }

  // Rondas siguientes: ganador de la llave k vs siguiente
  for (let round = 2; round <= totalRounds; round++) {
    const count = slots / Math.pow(2, round);
    for (let i = 0; i < count; i++) {
      // El feed proviene de la ronda anterior (round - 1)
      pushTieFrom(matches, round, i, round - 1, round - 1, double);
    }
  }

  // Tercer puesto entre perdedores de las dos semifinales
  if (includeThirdPlace && slots >= 8) {
    const semisCount = slots / 4; // cantidad de llaves de semifinal
    pushThirdPlace(matches, totalRounds, semisCount, 0, 1, double);
  }

  return { qualifiers, totalRounds, slots, matches };
}

function pushMatch(
  matches: BracketMatchDraft[],
  round: number,
  order: number,
  legIndex: number,
  data: Partial<BracketMatchDraft>
) {
  matches.push({
    round,
    order,
    legIndex,
    homeTeamId: data.homeTeamId,
    awayTeamId: data.awayTeamId,
    homeLabel: data.homeLabel,
    awayLabel: data.awayLabel,
    homeFeedFrom: data.homeFeedFrom,
    awayFeedFrom: data.awayFeedFrom,
  });
}

function pushTie(
  matches: BracketMatchDraft[],
  round: number,
  order: number,
  home: Qualifier,
  away: Qualifier,
  double: boolean
) {
  pushMatch(matches, round, order, 0, {
    homeTeamId: home.teamId,
    awayTeamId: away.teamId,
    homeLabel: home.label ?? home.teamName,
    awayLabel: away.label ?? away.teamName,
  });
  if (double) {
    pushMatch(matches, round, order, 1, {
      homeTeamId: away.teamId,
      awayTeamId: home.teamId,
      homeLabel: away.label ?? away.teamName,
      awayLabel: home.label ?? home.teamName,
    });
  }
}

function pushTieFrom(
  matches: BracketMatchDraft[],
  round: number,
  order: number,
  homeRound: number,
  awayRound: number,
  double: boolean
) {
  // Una llave sola: home alimentado por previo (2*order), away por previo (2*order+1)
  pushMatch(matches, round, order, 0, {
    homeFeedFrom: { round: homeRound, order: order * 2, slot: "home", legIndex: 0 },
    awayFeedFrom: { round: awayRound, order: order * 2 + 1, slot: "away", legIndex: 0 },
  });
  if (double) {
    pushMatch(matches, round, order, 1, {});
  }
}

function pushThirdPlace(
  matches: BracketMatchDraft[],
  round: number,
  order: number,
  semiHomeOrder: number,
  semiAwayOrder: number,
  double: boolean
) {
  pushMatch(matches, round, order, 0, {
    homeLabel: "Perdedor SF1",
    awayLabel: "Perdedor SF2",
    homeFeedFrom: { round: round - 1, order: semiHomeOrder, slot: "homeLoser", legIndex: 0 },
    awayFeedFrom: { round: round - 1, order: semiAwayOrder, slot: "awayLoser", legIndex: 0 },
  });
  if (double) {
    pushMatch(matches, round, order, 1, {});
  }
}

export function roundName(round: number, totalRounds: number): string {
  if (totalRounds <= 1) return "Final";
  const names: Record<number, string> = {
    0: "Final",
    1: "Semifinal",
    2: "Cuartos de final",
    3: "Octavos",
    4: "16avos",
  };
  return names[totalRounds - round] ?? `Ronda ${round}`;
}