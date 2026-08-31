import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy, Users, CalendarClock, Radio } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTournamentsForUser } from "@/lib/actions/tournament-actions";
import { StatusBadge } from "@/components/status-badge";
import { SportBadge } from "@/components/sport-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";


export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tournaments = await getTournamentsForUser();
  const [liveMatches, totalTeams] = await Promise.all([
    db.match.count({ where: { status: { in: ["EN_VIVO", "DESCANSO"] } } }),
    db.team.count(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Resumen</h1>
        <p className="text-muted-foreground text-sm">
          Hola {session.user.name}. Aquí está el estado de tus campeonatos.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Trophy} label="Campeonatos" value={tournaments.length} />
        <StatCard icon={Users} label="Equipos inscritos" value={totalTeams} />
        <StatCard icon={Radio} label="Partidos en vivo" value={liveMatches} />
        <StatCard icon={CalendarClock} label="Categorías" value={tournaments.reduce((a, t) => a + (t._count?.categories ?? 0), 0)} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mis campeonatos</h2>
          <Button asChild size="sm">
            <Link href="/panel/campeonatos/nuevo">Nuevo campeonato</Link>
          </Button>
        </div>
        {tournaments.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Empieza aquí</CardTitle>
              <CardDescription>
                Crea tu primer campeonato: agrega categorías, equipos y genera el fixture.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/panel/campeonatos/nuevo">Crear campeonato</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tournaments.map((t) => (
              <Card key={t.id} className="gap-3">
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{t.name}</h3>
                      <p className="text-muted-foreground text-xs">{t._count?.categories ?? 0} categorías</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <SportBadge sport={t.sport} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                  {t.categories?.some(c => c.championTeam) && (
                    <p className="text-sm">
                      Campeones: <span className="font-semibold">{t.categories.filter(c => c.championTeam).map(c => c.championTeam!.name).join(", ")}</span>
                    </p>
                  )}
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/panel/campeonatos/${t.id}`}>Gestionar</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string }) {
  return (
    <Card className="gap-2">
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-muted-foreground mt-1 text-xs">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
