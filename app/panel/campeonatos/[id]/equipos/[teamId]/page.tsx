import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getPlayers } from "@/lib/actions/player-actions";
import { PlayerManager, type PlayerRow } from "@/components/tournament/player-manager";
import { RosterAccessPanel } from "@/components/roster/roster-access-panel";
import { Button } from "@/components/ui/button";


export default async function TeamPlayersPage({
  params,
}: {
  params: Promise<{ id: string; teamId: string }>;
}) {
  const { id, teamId } = await params;
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true, rosterToken: true, rosterPin: true },
  });
  if (!team) notFound();

  const players = (await getPlayers(teamId)).map((p) => ({
    id: p.id,
    name: p.name,
    jerseyNumber: p.jerseyNumber,
    position: p.position,
    status: p.status,
    isCaptain: p.isCaptain,
  })) as PlayerRow[];

  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={`/panel/campeonatos/${id}/equipos`}>
          <ArrowLeft className="size-3" /> Volver a equipos
        </Link>
      </Button>
      <PlayerManager teamId={teamId} teamName={team.name} players={players} />
      <RosterAccessPanel teamId={teamId} token={team.rosterToken} pin={team.rosterPin} />
    </div>
  );
}