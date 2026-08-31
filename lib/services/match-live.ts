import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const liveInclude = {
  homeTeam: true,
  awayTeam: true,
  tournament: { select: { id: true, name: true, slug: true, logoUrl: true, city: true, venue: true } },
  phase: { select: { id: true, name: true, type: true } },
  group: { select: { id: true, name: true } },
  events: {
    include: { player: { select: { id: true, name: true, jerseyNumber: true } }, team: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  },
  penaltyShots: {
    include: { player: { select: { id: true, name: true, jerseyNumber: true } } },
    orderBy: { order: "asc" },
  },
} satisfies Prisma.MatchInclude;

type MatchLive = Prisma.MatchGetPayload<{ include: typeof liveInclude }>;

export function teamDto(team: { id: string; name: string; color: string | null; shieldUrl: string | null } | null) {
  return team ? { id: team.id, name: team.name, color: team.color, shieldUrl: team.shieldUrl } : null;
}

export function serializeMatchLive(match: MatchLive) {
  return {
    id: match.id,
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    homePenalties: match.homePenalties,
    awayPenalties: match.awayPenalties,
    usePenalties: match.usePenalties,
    winnerId: match.winnerId,
    startedAt: match.startedAt,
    endedAt: match.endedAt,
    scheduledAt: match.scheduledAt,
    venue: match.venue,
    jornada: match.jornada,
    order: match.order,
    homeLabel: match.homeLabel,
    awayLabel: match.awayLabel,
    homeTeam: teamDto(match.homeTeam),
    awayTeam: teamDto(match.awayTeam),
    tournament: match.tournament,
    phase: match.phase ? { id: match.phase.id, name: match.phase.name, type: match.phase.type } : null,
    group: match.group ? { id: match.group.id, name: match.group.name } : null,
    events: match.events.map((e) => ({
      id: e.id,
      type: e.type,
      teamId: e.teamId,
      playerId: e.playerId,
      minute: e.minute,
      note: e.note,
      createdAt: e.createdAt,
      playerName: e.player ? `${e.player.name}${e.player.jerseyNumber != null ? ` (#${e.player.jerseyNumber})` : ""}` : null,
      teamName: e.team?.name ?? null,
    })),
    penaltyShots: match.penaltyShots.map((p) => ({
      id: p.id,
      teamId: p.teamId,
      playerId: p.playerId,
      order: p.order,
      result: p.result,
      playerName: p.player ? p.player.name : null,
    })),
  };
}

/** Carga el estado "en vivo" de un partido (marcador + eventos) para consumo público */
export async function getMatchLive(matchId: string) {
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: liveInclude,
  });
  if (!match) return null;
  return serializeMatchLive(match);
}

/** Carga los próximos/en-vivo partidos de un torneo (para la portada pública) */
export async function listTournamentLive(tournamentId: string, limit = 12) {
  const matches = await db.match.findMany({
    where: { tournamentId, status: { in: ["EN_VIVO", "DESCANSO"] } },
    include: liveInclude,
    orderBy: { startedAt: "desc" },
    take: limit,
  });
  const recent = await db.match.findMany({
    where: { tournamentId, status: "FINALIZADO" },
    include: liveInclude,
    orderBy: { endedAt: "desc" },
    take: limit,
  });
  return [...matches, ...recent].map(serializeMatchLive);
}