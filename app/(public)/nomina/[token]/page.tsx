import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getRosterSession, rosterGetPlayers } from "@/lib/actions/roster-actions";
import { RosterPinForm } from "@/components/roster/roster-pin-form";
import { RosterPlayerManager } from "@/components/roster/roster-player-manager";

export const dynamic = "force-dynamic";

export default async function RosterPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Load team info by token (public, just to show team name)
  const team = await db.team.findUnique({
    where: { rosterToken: token },
    select: {
      id: true,
      name: true,
      color: true,
      shieldUrl: true,
      rosterPin: true,
      category: {
        select: {
          name: true,
          tournament: { select: { name: true } },
        },
      },
    },
  });

  if (!team || !team.rosterPin) notFound();

  // Check if already authenticated via cookie
  const session = await getRosterSession(token);

  if (!session) {
    return (
      <RosterPinForm
        token={token}
        teamName={team.name}
        teamColor={team.color}
        teamShield={team.shieldUrl}
        tournament={team.category.tournament.name}
        category={team.category.name}
      />
    );
  }

  // Authenticated: show player management
  const players = await rosterGetPlayers(token);

  return (
    <RosterPlayerManager
      token={token}
      teamName={team.name}
      teamColor={team.color}
      teamShield={team.shieldUrl}
      initialPlayers={players}
    />
  );
}
