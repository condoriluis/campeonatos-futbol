export type PenaltyInput = {
  order: number;
  teamId: string;
  converted: boolean;
};

export type PenaltyStatus = {
  home: { goals: number; attempts: number; shots: PenaltyInput[] };
  away: { goals: number; attempts: number; shots: PenaltyInput[] };
  finished: boolean;
  winnerTeamId: string | null;
  suddenDeath: boolean;
  stopped: boolean; // si se cerró por ventaja inalcanzable en la tanda regular
};

function countConverted(shots: PenaltyInput[]) {
  return shots.filter((s) => s.converted).length;
}

/**
 * Estado de una tanda de penales (formato):
 * - N lanzamientos por equipo, alternados.
 * - Si tras la tanda regular siguen empatados → muerte súbita (gol de oro por pares).
 * - La tanda termina cuando uno saca ventaja que el otro ya no puede igualar.
 */
export function computePenalties(
  homeTeamId: string,
  awayTeamId: string,
  shots: PenaltyInput[],
  initialCount = 5
): PenaltyStatus {
  const sortByOrder = (a: PenaltyInput, b: PenaltyInput) => a.order - b.order;
  const homeShots = shots.filter((s) => s.teamId === homeTeamId).sort(sortByOrder);
  const awayShots = shots.filter((s) => s.teamId === awayTeamId).sort(sortByOrder);

  const regularHome = homeShots.slice(0, initialCount);
  const regularAway = awayShots.slice(0, initialCount);
  const homeGoals = countConverted(homeShots);
  const awayGoals = countConverted(awayShots);
  const regularHomeGoals = countConverted(regularHome);
  const regularAwayGoals = countConverted(regularAway);

  // Ambos completaron la tanda regular
  const regularComplete = regularHome.length >= initialCount && regularAway.length >= initialCount;

  let winnerTeamId: string | null = null;
  let finished = false;
  let stopped = false;
  const suddenDeath = regularComplete && regularHomeGoals === regularAwayGoals;

  // Muerte súbita: comparar tras cada par completo desde el tirador N+1
  if (suddenDeath) {
    const extraHome = homeShots.slice(initialCount);
    const extraAway = awayShots.slice(initialCount);
    const maxPairs = Math.max(extraHome.length, extraAway.length);
    let homeExtra = 0;
    let awayExtra = 0;

    for (let i = 0; i < maxPairs; i++) {
      if (extraHome[i]) homeExtra += extraHome[i].converted ? 1 : 0;
      if (extraAway[i]) awayExtra += extraAway[i].converted ? 1 : 0;

      const hScore = regularHomeGoals + homeExtra;
      const aScore = regularAwayGoals + awayExtra;

      const homeTook = extraHome.length > i;
      const awayTook = extraAway.length > i;

      // Ambos han lanzado el mismo número en este par → decidir
      if (homeTook && awayTook && hScore !== aScore) {
        winnerTeamId = hScore > aScore ? homeTeamId : awayTeamId;
        finished = true;
        break;
      }
      // El equipo a favor aún no lanza (revisión de ventaja inalcanzable al final)
      if (i + 1 >= maxPairs) {
        const remainingAway = extraAway.length - (i + 1);
        const remainingHome = extraHome.length - (i + 1);
        const diff = Math.abs(hScore - aScore);
        const canCatch = remainingHome > 0 || remainingAway > 0;
        if (!canCatch && diff > 0) {
          winnerTeamId = hScore > aScore ? homeTeamId : awayTeamId;
          finished = true;
          break;
        }
        if (!canCatch && diff === 0) {
          // Nadie más lanza: empate sin resolución (depende de reglamento de fase)
          finished = false;
          break;
        }
      }
    }
  } else if (regularComplete) {
    // Empate regular o ventaja en regular
    if (regularHomeGoals !== regularAwayGoals) {
      winnerTeamId = regularHomeGoals > regularAwayGoals ? homeTeamId : awayTeamId;
      finished = true;
    } else {
      // Regla stop: si un equipo no puede alcanzar
      const remaining = initialCount - Math.min(homeShots.length, awayShots.length);
      if (remaining <= 0) {
        // Ambos agotaron y empatados sin muerte súbita configuración (no aplica)
      }
    }
  }

  // "Stopped": si la tanda regular ya tiene ventaja inalcanzable,
  // aunque no hayan completado los N tiros.
  if (!regularComplete) {
    const played = Math.min(homeShots.length, awayShots.length);
    const remaining = initialCount - played;
    const diff = Math.abs(homeGoals - awayGoals);
    if (remaining > 0 && diff > remaining) {
      winnerTeamId = homeGoals > awayGoals ? homeTeamId : awayTeamId;
      finished = true;
      stopped = true;
    }
  }

  return {
    home: { goals: homeGoals, attempts: homeShots.length, shots: homeShots },
    away: { goals: awayGoals, attempts: awayShots.length, shots: awayShots },
    finished,
    winnerTeamId,
    suddenDeath,
    stopped,
  };
}

/**
 * Ganador de una llave de ida y vuelta por agregado (con penales opcionales).
 */
export function winnerOfTie(
  homeScore: number,
  awayScore: number,
  homeSecondScore: number,
  awaySecondScore: number,
  homePenalties?: number | null,
  awayPenalties?: number | null
): { winner: "home" | "away" | null; viaPenalties: boolean } {
  const aggregateHome = homeScore + homeSecondScore;
  const aggregateAway = awayScore + awaySecondScore;
  if (aggregateHome > aggregateAway) return { winner: "home", viaPenalties: false };
  if (aggregateHome < aggregateAway) return { winner: "away", viaPenalties: false };

  // Empate global → penales
  if (homePenalties != null && awayPenalties != null && homePenalties !== awayPenalties) {
    return {
      winner: homePenalties > awayPenalties ? "home" : "away",
      viaPenalties: true,
    };
  }
  return { winner: null, viaPenalties: false };
}