import Link from "next/link";
import { notFound } from "next/navigation";
import { Radio } from "lucide-react";
import { getTournamentById } from "@/lib/actions/tournament-actions";
import { getCategoriesWithTeams } from "@/lib/actions/category-actions";
import { listPhases } from "@/lib/actions/phase-actions";
import { getPhaseMatches } from "@/lib/actions/fixture-actions";
import { PhaseSwitcher, type PhaseOption } from "@/components/tournament/phase-switcher";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";


export default async function MatchesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ phase?: string }>;
}) {
  const { id } = await params;
  const tournament = await getTournamentById(id);
  if (!tournament) notFound();

  const sp = await searchParams;
  const categories = await getCategoriesWithTeams(id);

  const phaseOptions: PhaseOption[] = [];
  for (const cat of categories) {
    const phases = await listPhases(cat.id);
    for (const p of phases) {
      phaseOptions.push({ id: p.id, label: `${cat.name} · ${p.name}` });
    }
  }

  let selected = sp.phase ?? phaseOptions[0]?.id;
  if (!phaseOptions.some((p) => p.id === selected)) selected = phaseOptions[0]?.id;

  const matches = selected ? await getPhaseMatches(selected) : [];
  const byJornada = matches.reduce<Record<number, typeof matches>>((acc, m) => {
    const j = m.jornada ?? 0;
    (acc[j] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Partidos</h2>
        <PhaseSwitcher phases={phaseOptions} value={selected ?? ""} />
      </div>

      {!selected || matches.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay partidos. Genera el fixture desde la pestaña Fases y fixture.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(byJornada)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([jornada, ms]) => (
              <section key={jornada} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {matches.length > 5 ? `Jornada ${jornada}` : ""}
                </h3>
                <div className="grid gap-2">
                  {ms.map((m) => (
                    <div key={m.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex flex-1 items-center gap-2 text-sm">
                        <span className="w-24 truncate text-right font-medium sm:w-32">{m.homeTeam?.name ?? m.homeTeamId ?? "—"}</span>
                        <span className="font-mono text-lg font-bold tabular-nums">
                          {m.status === "FINALIZADO" ? `${m.homeScore ?? 0} - ${m.awayScore ?? 0}` : "vs"}
                        </span>
                        <span className="w-24 truncate font-medium sm:w-32">{m.awayTeam?.name ?? m.awayTeamId ?? "—"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground sm:justify-end">
                        <span>
                          {m.group?.name ? `Grupo ${m.group.name} · ` : ""}
                          {m.venue || "Sin sede"} · {formatDateTime(m.scheduledAt)}
                        </span>
                        <StatusBadge status={m.status} />
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/panel/campeonatos/${id}/marcador/${m.id}`}>
                            <Radio className="size-3" /> Marcador
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}