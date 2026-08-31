import { notFound } from "next/navigation";
import { getTournamentById } from "@/lib/actions/tournament-actions";
import { getRules } from "@/lib/actions/rules-actions";
import { RulesForm } from "@/components/tournament/rules-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RulesInput } from "@/lib/validations/tournament";

export const dynamic = "force-dynamic";

export default async function RulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournamentById(id);
  if (!tournament) notFound();

  const rules = await getRules(id);
  const initial = rules ? ({ ...rules, tiebreakers: (rules as { tiebreakers?: string[] }).tiebreakers ?? [] } as RulesInput) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reglamento del campeonato</CardTitle>
      </CardHeader>
      <CardContent>
        <RulesForm tournamentId={id} initial={initial} />
      </CardContent>
    </Card>
  );
}