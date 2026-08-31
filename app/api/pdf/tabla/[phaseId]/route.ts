import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { db } from "@/lib/db";
import { TablaDocument, type TablaData } from "@/lib/pdf/tabla";
import { computeGroupStandingsData } from "@/lib/actions/standings-actions";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ phaseId: string }> }) {
  const { phaseId } = await params;
  const phase = await db.phase.findUnique({
    where: { id: phaseId },
    include: { category: { select: { name: true, tournament: { select: { name: true } } } } },
  });
  if (!phase) return Response.json({ error: "Fase no encontrada" }, { status: 404 });

  const data = await computeGroupStandingsData(phaseId);

  const pdfData: TablaData = {
    tournament: phase.category.tournament.name,
    category: phase.category.name,
    phase: phase.name,
    qualifiers: data.qualifiers.map((q) => q.label ?? q.teamId),
    groups: data.groups.map((g) => ({
      name: g.groupName,
      rows: g.rows.map((r) => ({
        position: r.position,
        team: r.teamName,
        played: r.played,
        won: r.won,
        drawn: r.drawn,
        lost: r.lost,
        goalDiff: r.goalDiff,
        points: r.points,
      })),
    })),
  };

  const element = createElement(TablaDocument, { data: pdfData }) as Parameters<typeof pdf>[0];
  const blob = await pdf(element).toBlob();
  return new Response(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="tabla-${phaseId}.pdf"`,
    },
  });
}