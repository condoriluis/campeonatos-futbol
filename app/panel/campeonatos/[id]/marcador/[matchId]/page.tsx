import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { LiveMatchView } from "@/components/live/live-match-view";
import { Button } from "@/components/ui/button";
import { getTournamentById } from "@/lib/actions/tournament-actions";

export const dynamic = "force-dynamic";

export default async function LiveMatchPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const { id, matchId } = await params;
  const tournament = await getTournamentById(id);
  if (!tournament) notFound();

  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { id: true, homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } }, tournamentId: true },
  });
  if (!match || match.tournamentId !== id) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={`/panel/campeonatos/${id}/partidos`}>
          <ArrowLeft className="size-3" /> Volver
        </Link>
      </Button>
      <LiveMatchView matchId={matchId} />
    </div>
  );
}