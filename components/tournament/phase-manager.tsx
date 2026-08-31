"use client";

import { PhaseCreateDialog } from "@/components/tournament/phase-create-dialog";
import { GroupsPhaseCard } from "@/components/tournament/groups-phase-card";
import { KnockoutPhaseCard } from "@/components/tournament/knockout-phase-card";
import type { PhaseRow, TeamOption } from "@/components/tournament/types";
import { Card, CardContent } from "@/components/ui/card";

export type PhaseCategory = {
  id: string;
  name: string;
  phases: PhaseRow[];
};

export function PhaseManager({
  tournamentId,
  categories,
  teamsByCategory,
}: {
  tournamentId: string;
  categories: PhaseCategory[];
  teamsByCategory: Record<string, TeamOption[]>;
}) {
  return (
    <div className="flex flex-col gap-6">
      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Primero crea una categoría para poder configurar las fases.
          </CardContent>
        </Card>
      ) : (
        categories.map((cat) => (
          <section key={cat.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{cat.name}</h3>
              <PhaseCreateDialog
                categoryId={cat.id}
                phases={cat.phases.map((p) => ({ id: p.id, name: p.name, type: p.type }))}
              />
            </div>
            {cat.phases.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Sin fases. Crea una fase de grupos o de llaves.
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {cat.phases.map((phase) =>
                  phase.type === "GRUPOS" ? (
                    <GroupsPhaseCard
                      key={phase.id}
                      phase={phase}
                      teams={teamsByCategory[cat.id] ?? []}
                      tournamentId={tournamentId}
                    />
                  ) : (
                    <KnockoutPhaseCard key={phase.id} phase={phase} tournamentId={tournamentId} />
                  )
                )}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}