import { notFound } from "next/navigation";
import { getTournamentById } from "@/lib/actions/tournament-actions";
import { getCategoriesWithTeams } from "@/lib/actions/category-actions";
import { CategoryManager, type CategoryRow } from "@/components/tournament/category-manager";


export default async function CategoriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournamentById(id);
  if (!tournament) notFound();

  const categories = (await getCategoriesWithTeams(id)).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    color: c.color,
    teams: c.teams.map((t) => ({ id: t.id, name: t.name, _count: { players: t._count.players } })),
  })) as CategoryRow[];

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Categorías</h2>
      <CategoryManager tournamentId={id} categories={categories} />
    </div>
  );
}