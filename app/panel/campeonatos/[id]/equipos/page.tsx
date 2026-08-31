import { notFound } from "next/navigation";
import { getTournamentById } from "@/lib/actions/tournament-actions";
import { getCategoriesWithTeams } from "@/lib/actions/category-actions";
import { TeamManager, type CategoryWithTeams } from "@/components/tournament/team-manager";

export const dynamic = "force-dynamic";

export default async function TeamsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournamentById(id);
  if (!tournament) notFound();

  const categories = (await getCategoriesWithTeams(id)).map((c) => ({
    id: c.id,
    name: c.name,
    teams: c.teams.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      shieldUrl: t.shieldUrl,
      status: t.status,
      captainName: t.captainName,
      delegateName: t.delegateName,
      _count: { players: t._count.players },
    })),
  })) as CategoryWithTeams[];

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Equipos</h2>
      <TeamManager tournamentId={id} categories={categories} />
    </div>
  );
}