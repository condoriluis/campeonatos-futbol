import type { Qualifier, StandingRow } from "@/lib/engine/types";

export type ClassificationConfig = {
  classifyPerGroup: number;
  bestThirds: number;
  prefersThirdPlaceTeam?: boolean;
};

/**
 * Calcula los clasificados desde las tablas de cada grupo.
 * Devuelve la lista en "orden de cruce": 1° de cada grupo, 2° de cada grupo,
 * ... y al final los mejores terceros.
 */
export function classifyFromGroups(
  groups: { name: string; rows: StandingRow[] }[],
  config: ClassificationConfig
): { qualifiers: Qualifier[]; groupsData: { name: string; classified: string[] }[] } {
  const classifyPerGroup = Math.max(0, config.classifyPerGroup);
  const bestThirds = Math.max(0, config.bestThirds);

  // byRank[0] = 1° de cada grupo, byRank[1] = 2° de cada grupo, etc.
  const byRank: Qualifier[][] = [];
  const thirds: { qualifier: Qualifier; points: number; goalDiff: number; goalsFor: number }[] = [];

  const groupsData = groups.map((g) => {
    const ordered = [...g.rows].sort((a, b) => a.position - b.position);
    const classified: string[] = [];

    ordered.forEach((row, idx) => {
      const pos = idx + 1;
      const q: Qualifier = {
        teamId: row.teamId,
        teamName: row.teamName,
        label: `${pos}${g.name}`,
        groupName: g.name,
        seed: pos,
      };

      if (pos <= classifyPerGroup) {
        (byRank[pos - 1] ??= []).push(q);
        classified.push(row.teamId);
      } else if (pos === classifyPerGroup + 1 && bestThirds > 0) {
        // el siguiente a los clasificados participa como "mejor tercero"
        thirds.push({
          qualifier: { ...q, label: `${pos}º ${g.name}` },
          points: row.points,
          goalDiff: row.goalDiff,
          goalsFor: row.goalsFor,
        });
      }
    });

    return { name: g.name, classified };
  });

  const qualifiers: Qualifier[] = [];
  for (const rank of byRank) qualifiers.push(...rank);

  const bestThirdsSorted = thirds
    .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor)
    .slice(0, bestThirds)
    .map((t) => t.qualifier);

  qualifiers.push(...bestThirdsSorted);
  return { qualifiers, groupsData };
}