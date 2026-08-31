/**
 * Generador de fixture round-robin (todos contra todos) con el método del círculo.
 * Devuelve jornadas; cada jornada es una lista de pares [local, visitante].
 */
export type RoundRobinMatch = { home: string; away: string };
export type RoundRobinRound = RoundRobinMatch[];

export function generateRoundRobin(teamIds: string[], rounds = 1): RoundRobinRound[] {
  const n = teamIds.length;
  if (n < 2) return [];

  // Método del círculo: se fija un equipo y se rotan los demás.
  const hasBye = n % 2 === 1;
  const teams = hasBye ? [...teamIds, "__DESCANSO__"] : [...teamIds];
  const matchCount = teams.length; // par
  const half = matchCount / 2;

  const single: RoundRobinRound[] = [];
  for (let r = 0; r < matchCount - 1; r++) {
    const pairs: RoundRobinMatch[] = [];
    const flipHomeAway = r % 2 === 1;
    for (let i = 0; i < half; i++) {
      const a = teams[i];
      const b = teams[matchCount - 1 - i];
      if (a === "__DESCANSO__" || b === "__DESCANSO__") continue;
      // Alternar local/visitante por jornada completa para balancear sedes
      pairs.push(flipHomeAway ? { home: b, away: a } : { home: a, away: b });
    }
    single.push(pairs);
    // Rotar: el último pasa a la posición 1; el primero queda fijo.
    teams.splice(1, 0, teams.pop()!);
  }

  if (rounds <= 1) {
    return single;
  }

  // Vuelta de revancha: invertir local/visitante
  const double: RoundRobinRound[] = [...single];
  for (const round of single) {
    double.push(round.map((p) => ({ home: p.away, away: p.home })));
  }
  return double;
}

/**
 * Distribuye equipos en grupos balanceados (tamaños lo más parejos posible,
 * los grupos iniciales con un equipo extra si no es divisible).
 */
export function distributeIntoGroups(teamIds: string[], groupCount: number): string[][] {
  if (groupCount <= 1) return [teamIds];
  const n = teamIds.length;
  if (n === 0) return [];
  if (groupCount > n) groupCount = n;

  const base = Math.floor(n / groupCount);
  const extra = n % groupCount;

  const groups: string[][] = [];
  let cursor = 0;
  for (let g = 0; g < groupCount; g++) {
    const size = base + (g < extra ? 1 : 0);
    groups.push(teamIds.slice(cursor, cursor + size));
    cursor += size;
  }
  return groups;
}