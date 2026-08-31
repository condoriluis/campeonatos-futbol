import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { db } from "@/lib/db";
import { FixtureDocument, type FixtureData } from "@/lib/pdf/fixture";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ phaseId: string }> }) {
  const { phaseId } = await params;
  const phase = await db.phase.findUnique({
    where: { id: phaseId },
    include: { category: { select: { name: true, tournament: { select: { name: true, venue: true } } } } },
  });
  if (!phase) return Response.json({ error: "Fase no encontrada" }, { status: 404 });

  const rows = await db.match.findMany({
    where: { phaseId },
    include: { homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } }, group: { select: { name: true } } },
    orderBy: [{ jornada: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });

  if (rows.length === 0) {
    return Response.json({ error: "La fase aún no tiene partidos generados" }, { status: 400 });
  }

  const pdfData: FixtureData = {
    tournament: phase.category.tournament.name,
    category: phase.category.name,
    phase: phase.name,
    venue: phase.category.tournament.venue,
    rows: rows.map((m) => ({
      order: m.order,
      jornada: m.jornada,
      group: m.group?.name ?? null,
      scheduledAt: m.scheduledAt,
      venue: m.venue,
      home: m.homeTeam?.name ?? m.homeLabel ?? "—",
      away: m.awayTeam?.name ?? m.awayLabel ?? "—",
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
    })),
  };

  const element = createElement(FixtureDocument, { data: pdfData }) as Parameters<typeof pdf>[0];
  const blob = await pdf(element).toBlob();
  return new Response(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="fixture-${phaseId}.pdf"`,
    },
  });
}