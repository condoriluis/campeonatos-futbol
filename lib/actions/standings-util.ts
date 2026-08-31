import { db } from "@/lib/db";
import { computeStandings, aggregateCards } from "@/lib/engine/standings";
import { classifyFromGroups } from "@/lib/engine/classification";
import type { Qualifier } from "@/lib/engine/types";

/**
 * Calcula los clasificados de una fase de grupos (usado al generar llaves).
 */
export async function computeStandardQualifiers(phaseId: string): Promise<Qualifier[]> {
  const phase = await db.phase.findUnique({ where: { id: phaseId } });
  if (!phase) return [];

  const groups = await db.group.findMany({
    where: { phaseId },
    include: { members: { include: { team: true }, orderBy: { seed: "asc" } } },
    orderBy: { position: "asc" },
  });

  const matches = await db.match.findMany({
    where: { phaseId, status: "FINALIZADO" },
    select: {
      id: true,
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      status: true,
      jornada: true,
      scheduledAt: true,
      venue: true,
      homePenalties: true,
      awayPenalties: true,
      winnerId: true,
      categoryId: true,
      groupId: true,
      events: { select: { playerId: true, type: true, teamId: true } },
    },
  });

  const rules = await db.tournamentRules.findFirst({
    where: { tournament: { categories: { some: { phases: { some: { id: phaseId } } } } } },
  });
  const config = (phase.config ?? {}) as Record<string, unknown>;

  const groupStandings = groups.map((group) => {
    const groupMatches = matches.filter((m) => m.groupId === group.id);
    const cardMap = aggregateCards(groupMatches.flatMap((m) => m.events.map((e) => ({ type: e.type, teamId: e.teamId }))));
    const teams = group.members.map((gm) => gm.team);
    const { rows } = computeStandings(
      groupMatches.map((m) => ({
        id: m.id,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        status: m.status as "FINALIZADO",
        jornada: m.jornada,
        scheduledAt: m.scheduledAt,
        venue: m.venue,
        homePenalties: m.homePenalties,
        awayPenalties: m.awayPenalties,
        winnerId: m.winnerId,
        categoryId: m.categoryId,
        groupId: m.groupId,
        events: [],
      })),
      teams.map((t) => ({ id: t.id, name: t.name, color: t.color, shieldUrl: t.shieldUrl })),
      {
        pointsWin: rules?.pointsWin,
        pointsDraw: rules?.pointsDraw,
        pointsLoss: rules?.pointsLoss,
        tiebreakers: rules?.tiebreakers,
        cards: cardMap,
      }
    );
    return { name: group.name, rows };
  });

  const { qualifiers } = classifyFromGroups(groupStandings, {
    classifyPerGroup: (config.classifyPerGroup as number) ?? 2,
    bestThirds: (config.bestThirds as number) ?? 0,
  });

  return qualifiers;
}