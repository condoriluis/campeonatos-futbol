import { notFound } from "next/navigation";
import { getTournamentById } from "@/lib/actions/tournament-actions";
import { getCategoriesWithTeams } from "@/lib/actions/category-actions";
import { listPhases } from "@/lib/actions/phase-actions";
import { PhaseManager, type PhaseCategory } from "@/components/tournament/phase-manager";
import type { GroupRow, PhaseRow, TeamOption } from "@/components/tournament/types";


export default async function PhasesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournamentById(id);
  if (!tournament) notFound();

  const categories = await getCategoriesWithTeams(id);
  const teamsByCategory: Record<string, TeamOption[]> = {};

  const phaseCategories: PhaseCategory[] = [];
  for (const cat of categories) {
    teamsByCategory[cat.id] = cat.teams.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      status: t.status,
    }));
    const phases = await listPhases(cat.id);
    phaseCategories.push({
      id: cat.id,
      name: cat.name,
      phases: phases.map(
        (p): PhaseRow => ({
          id: p.id,
          name: p.name,
          type: p.type,
          status: p.status,
          position: p.position,
          config: (p.config ?? {}) as Record<string, unknown>,
          fromPhaseId: p.fromPhaseId,
          fromPhase: p.fromPhase ?? null,
          groups: p.groups.map(
            (g): GroupRow => ({
              id: g.id,
              name: g.name,
              position: g.position,
              members: g.members.map((m) => ({
                teamId: m.teamId,
                seed: m.seed,
                team: { id: m.team.id, name: m.team.name, color: m.team.color },
              })),
            })
          ),
          _count: { matches: p._count.matches },
        })
      ),
    });
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Fases y fixture</h2>
      <PhaseManager tournamentId={id} categories={phaseCategories} teamsByCategory={teamsByCategory} />
    </div>
  );
}