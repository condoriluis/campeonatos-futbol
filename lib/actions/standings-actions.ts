"use server";

import { db } from "@/lib/db";
import { computeStandings, aggregateCards, type CardStats } from "@/lib/engine/standings";
import type { MatchScoreInput, StandingRow } from "@/lib/engine/types";
import type { EventType } from "@prisma/client";
import { classifyFromGroups } from "@/lib/engine/classification";

export type GroupStandingsData = {
  groupId: string;
  groupName: string;
  rows: StandingRow[];
};

function toMatchScoreInput(m: {
  id: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  jornada: number | null;
  scheduledAt: Date | null;
  venue: string | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  winnerId: string | null;
  categoryId: string;
  groupId: string | null;
  events: { playerId: string | null; type: string }[];
}): MatchScoreInput {
  return {
    id: m.id,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status as MatchScoreInput["status"],
    jornada: m.jornada,
    scheduledAt: m.scheduledAt,
    venue: m.venue,
    homePenalties: m.homePenalties,
    awayPenalties: m.awayPenalties,
    winnerId: m.winnerId,
    categoryId: m.categoryId,
    groupId: m.groupId,
    events: m.events.map((e) => ({ playerId: e.playerId, type: e.type as EventType })),
  };
}

/**
 * Calcula la tabla de posiciones de todos los grupos de una fase.
 * Si `persist = true`, guarda filas oficiales en la tabla Standing.
 */
export async function computeGroupStandingsData(phaseId: string, persist = false) {
  const phase = await db.phase.findUnique({ where: { id: phaseId } });
  if (!phase) return { groups: [], qualifiers: [] as { teamId: string; label?: string }[] };

  const groups = await db.group.findMany({
    where: { phaseId },
    include: {
      members: { include: { team: true }, orderBy: { seed: "asc" } },
    },
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

  const groupData: GroupStandingsData[] = groups.map((group) => {
    const groupMatches = matches.filter((m) => m.groupId === group.id);
    const cardMap: CardStats = aggregateCards(
      groupMatches.flatMap((m) =>
        m.events.map((e) => ({ type: e.type, teamId: e.teamId }))
      )
    );
    const teams = group.members.map((gm) => gm.team);
    const { rows } = computeStandings(
      groupMatches.map(toMatchScoreInput),
      teams.map((t) => ({ id: t.id, name: t.name, color: t.color, shieldUrl: t.shieldUrl })),
      {
        pointsWin: rules?.pointsWin,
        pointsDraw: rules?.pointsDraw,
        pointsLoss: rules?.pointsLoss,
        tiebreakers: rules?.tiebreakers,
        cards: cardMap,
      }
    );
    return { groupId: group.id, groupName: group.name, rows };
  });

  // Clasificados según configuración
  const { qualifiers } = classifyFromGroups(
    groupData.map((g) => ({ name: g.groupName, rows: g.rows })),
    {
      classifyPerGroup: (config.classifyPerGroup as number) ?? 2,
      bestThirds: (config.bestThirds as number) ?? 0,
    }
  );

  if (persist) {
    for (const g of groupData) {
      await db.standing.deleteMany({ where: { groupId: g.groupId } });
      await db.standing.createMany({
        data: g.rows.map((r) => ({
          groupId: g.groupId,
          teamId: r.teamId,
          position: r.position,
          played: r.played,
          won: r.won,
          drawn: r.drawn,
          lost: r.lost,
          goalsFor: r.goalsFor,
          goalsAgainst: r.goalsAgainst,
          goalDiff: r.goalDiff,
          points: r.points,
        })),
      });
    }
  }

  return { groups: groupData, qualifiers };
}

export async function getOfficialStandings(groupId: string) {
  return db.standing.findMany({
    where: { groupId },
    orderBy: { position: "asc" },
    include: { team: { select: { id: true, name: true, color: true, shieldUrl: true } } },
  });
}