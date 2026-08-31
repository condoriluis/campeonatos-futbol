import Link from "next/link";
import { notFound } from "next/navigation";
import { Users, Trophy } from "lucide-react";
import { getTournamentBySlug } from "@/lib/actions/tournament-actions";
import { getTournamentById } from "@/lib/actions/tournament-actions";
import { TournamentStatusControl, DeleteTournamentButton } from "@/components/tournament/tournament-status";
import { SportBadge } from "@/components/sport-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";


export default async function TournamentOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getTournamentById(id);
  if (!tournament) notFound();

  const detail = await getTournamentBySlug(tournament.slug);
  if (!detail) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              Detalles
              <SportBadge sport={tournament.sport} />
            </CardTitle>
            <div className="flex items-center gap-2">
              <TournamentStatusControl id={id} status={tournament.status} />
              <DeleteTournamentButton id={id} name={tournament.name} />
            </div>
          </div>
          {tournament.description && <CardDescription>{tournament.description}</CardDescription>}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Info label="Sede" value={tournament.venue} />
          <Info label="Ciudad" value={tournament.city} />
          <Info label="Inicio" value={tournament.startDate?.toLocaleDateString("es")} />
          <Info label="Fin" value={tournament.endDate?.toLocaleDateString("es")} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" /> Categorías
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {detail.categories.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aún no hay categorías.</p>
            ) : (
              detail.categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    {c.name}
                    <span className="text-muted-foreground text-xs">{c.type}</span>
                  </span>
                  <span className="text-muted-foreground text-xs">{c._count.teams} equipos</span>
                </div>
              ))
            )}
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href={`/panel/campeonatos/${id}/categorias`}>Gestionar categorías</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-4" /> Campeones por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {detail.categories.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay categorías.</p>
            ) : (
              detail.categories.map((c) => (
                <div key={c.id} className="rounded-md border px-3 py-2">
                  <p className="text-xs text-muted-foreground mb-0.5">{c.name}</p>
                  {c.championTeam ? (
                    <div className="flex items-center gap-2">
                      <Trophy className="size-3 text-amber-500" />
                      <p className="text-sm font-bold">{c.championTeam.name}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Por definir</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {detail.rules && (
        <Card>
          <CardHeader>
            <CardTitle>Reglamento</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Separator />
            <div className="grid gap-2 sm:grid-cols-3">
              <Info label="Duración" value={`${detail.rules.durationMinutes} min + ${detail.rules.breakMinutes} descanso`} />
              <Info label="Puntos" value={`${detail.rules.pointsWin} / ${detail.rules.pointsDraw} / ${detail.rules.pointsLoss}`} />
              <Info label="Arqueros y cambio" value={`Mín ${detail.rules.minPlayers}, máx ${detail.rules.maxPlayers}, ${detail.rules.substitutesCount} cambios`} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}