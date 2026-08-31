import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { db } from "@/lib/db";
import { ActaDocument, type ActaData } from "@/lib/pdf/acta";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: { select: { name: true } },
      category: { select: { name: true } },
      phase: { select: { name: true } },
      group: { select: { name: true } },
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
      winner: { select: { name: true } },
      operators: { include: { user: { select: { name: true } } } },
      events: { orderBy: [{ minute: "asc" }, { createdAt: "asc" }], include: { player: { select: { name: true } } } },
    },
  });
  if (!match) return Response.json({ error: "Partido no encontrado" }, { status: 404 });

  const data: ActaData = {
    tournament: match.tournament.name,
    category: match.category.name,
    phase: match.phase.name,
    matchLabel: match.jornada != null ? `Fecha ${match.jornada}` : "Llave",
    groupName: match.group?.name ?? null,
    venue: match.venue,
    scheduledAt: match.scheduledAt ? formatDateTime(match.scheduledAt) : "Sin horario",
    homeName: match.homeTeam?.name ?? match.homeLabel ?? "—",
    homeScore: match.homeScore ?? 0,
    awayName: match.awayTeam?.name ?? match.awayLabel ?? "—",
    awayScore: match.awayScore ?? 0,
    homePenalties: match.homePenalties,
    awayPenalties: match.awayPenalties,
    winnerName: match.winner?.name ?? null,
    usePenalties: match.usePenalties,
    events: match.events.map((e) => ({
      minute: e.minute,
      type: e.type,
      teamId: e.teamId ?? "",
      teamName: e.teamId === match.homeTeamId ? (match.homeTeam?.name ?? "Local") : e.teamId === match.awayTeamId ? (match.awayTeam?.name ?? "Visita") : "—",
      playerName: e.player?.name ?? "",
      note: e.note ?? "",
    })),
    operator: match.operators[0]?.user.name ?? null,
  };

  const element = createElement(ActaDocument, { data }) as Parameters<typeof pdf>[0];
  const blob = await pdf(element).toBlob();
  return new Response(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="acta-${matchId}.pdf"`,
    },
  });
}