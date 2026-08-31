import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { LiveMatchView } from "@/components/live/live-match-view";

export const dynamic = "force-dynamic";

export default async function PublicLiveMatchPage({
  params,
}: {
  params: Promise<{ slug: string; matchId: string }>;
}) {
  const { slug, matchId } = await params;
  const tournament = await db.tournament.findUnique({ where: { slug } });
  if (!tournament) notFound();

  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { id: true, tournamentId: true },
  });
  if (!match || match.tournamentId !== tournament.id) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <LiveMatchView matchId={matchId} viewer />
    </div>
  );
}