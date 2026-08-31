import { notFound } from "next/navigation";
import { getTournamentById } from "@/lib/actions/tournament-actions";
import { computeGroupStandingsData } from "@/lib/actions/standings-actions";
import { listPhases } from "@/lib/actions/phase-actions";
import { PhaseSwitcher, type PhaseOption } from "@/components/tournament/phase-switcher";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function StandingsPage({
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
  const phases = await getAllPhases(id);
  let selected = sp.phase ?? phases[0]?.id;
  if (!phases.some((p) => p.id === selected)) selected = phases[0]?.id;

  const options: PhaseOption[] = phases.map((p) => ({ id: p.id, label: p.label }));
  const selectedPhase = phases.find((p) => p.id === selected);

  if (selectedPhase?.type === "LLAVES") {
    return (
      <div>
        <h2 className="mb-4 text-lg font-semibold">Tabla de posiciones</h2>
        <PhaseSwitcher phases={options} value={selected ?? ""} />
        <Card className="mt-4">
          <CardContent className="py-10 text-center text-muted-foreground">
            Esta fase es de eliminación directa (Llaves). Las posiciones se definen por el avance en el cuadro de partidos.
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = selected ? await computeGroupStandingsData(selected) : null;

  if (!data || data.groups.length === 0) {
    return (
      <div>
        <h2 className="mb-4 text-lg font-semibold">Tabla de posiciones</h2>
        <PhaseSwitcher phases={options} value={selected ?? ""} />
        <Card className="mt-4">
          <CardContent className="py-10 text-center text-muted-foreground">
            Aún no hay posiciones calculadas.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Tabla de posiciones</h2>
        <div className="flex items-center gap-2">
          {selected && (
            <Button asChild variant="outline" size="sm">
              <a href={`/api/pdf/tabla/${selected}`} target="_blank" rel="noopener noreferrer">
                Exportar PDF
              </a>
            </Button>
          )}
          <PhaseSwitcher phases={options} value={selected ?? ""} />
        </div>
      </div>

      {data.qualifiers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Clasifican:</span>
          {data.qualifiers.map((q, i) => (
            <Badge key={`${q.teamId}-${i}`} variant="success">
              {q.label ?? q.teamId.slice(0, 8)}
            </Badge>
          ))}
        </div>
      )}

      <div className={data.groups.length > 1 ? "grid gap-4 lg:grid-cols-2" : ""}>
        {data.groups.map((g) => (
          <Card key={g.groupId} className="gap-0 overflow-hidden p-0">
            <div className="border-b px-4 py-3 font-semibold">Grupo {g.groupName}</div>
            <TooltipProvider delayDuration={100}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 text-center">#</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger className="cursor-help underline decoration-dashed underline-offset-2">PJ</TooltipTrigger>
                        <TooltipContent>Partidos Jugados</TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger className="cursor-help underline decoration-dashed underline-offset-2">G</TooltipTrigger>
                        <TooltipContent>Partidos Ganados</TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger className="cursor-help underline decoration-dashed underline-offset-2">E</TooltipTrigger>
                        <TooltipContent>Partidos Empatados</TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger className="cursor-help underline decoration-dashed underline-offset-2">P</TooltipTrigger>
                        <TooltipContent>Partidos Perdidos</TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger className="cursor-help underline decoration-dashed underline-offset-2">DG</TooltipTrigger>
                        <TooltipContent>Diferencia de Goles</TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-right">
                      <Tooltip>
                        <TooltipTrigger className="cursor-help underline decoration-dashed underline-offset-2">Pts</TooltipTrigger>
                        <TooltipContent>Puntos</TooltipContent>
                      </Tooltip>
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {g.rows.map((r) => (
                    <TableRow key={r.teamId}>
                      <TableCell className="text-center font-bold">{r.position}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        <span className="size-3 rounded-full" style={{ background: r.teamColor ?? "#94a3b8" }} />
                        <span className="truncate">{r.teamName}</span>
                      </TableCell>
                      <TableCell className="text-center">{r.played}</TableCell>
                      <TableCell className="text-center">{r.won}</TableCell>
                      <TableCell className="text-center">{r.drawn}</TableCell>
                      <TableCell className="text-center">{r.lost}</TableCell>
                      <TableCell className="text-center">{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</TableCell>
                      <TableCell className="text-right font-bold">{r.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TooltipProvider>
          </Card>
        ))}
      </div>
    </div>
  );
}

async function getAllPhases(tournamentId: string): Promise<{ id: string; label: string; type: string }[]> {
  const categories = await import("@/lib/actions/category-actions").then((m) => m.getCategoriesWithTeams(tournamentId));
  const out: { id: string; label: string; type: string }[] = [];
  for (const cat of categories) {
    const phases = await listPhases(cat.id);
    for (const p of phases) out.push({ id: p.id, label: `${cat.name} · ${p.name}`, type: p.type });
  }
  return out;
}