import Link from "next/link";
import { ArrowRight, Clock, MapPin, Trophy } from "lucide-react";
import { getPublicTournaments } from "@/lib/actions/tournament-actions";
import { StatusBadge } from "@/components/status-badge";
import { SportBadge } from "@/components/sport-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const tournaments = await getPublicTournaments();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16">
      <section className="flex flex-col items-center gap-6 py-16 text-center">
        <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Plataforma de torneos deportivos
        </span>
        <h1 className="font-heading max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
          Organiza, dirige y vive tu campeonato en <span className="text-primary">tiempo real</span>
        </h1>
        <p className="text-muted-foreground max-w-xl text-lg">
          Sorteo de grupos, fixture automático, marcador en vivo, tablas de posiciones y actas de partido desde el celular.
        </p>
        <div className="flex gap-3">
          <Button asChild size="lg">
            <Link href="/register">Crear mi campeonato</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="#torneos">Ver torneos</Link>
          </Button>
        </div>
      </section>

      <section id="torneos" className="flex flex-col gap-4 pb-8">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold">Torneos públicos</h2>
        </div>
        {tournaments.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Aún no hay campeonatos publicados. Crea el primero.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {tournaments.map((t) => (
              <Card key={t.id} className="gap-3">
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Trophy className="size-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold leading-tight">{t.name}</h3>
                        <p className="text-muted-foreground text-xs">
                          {t.city ?? t.venue ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <SportBadge sport={t.sport} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Trophy className="size-3" /> {t._count.categories} categorías
                    </span>
                    {t.startDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> {formatDate(t.startDate)}
                      </span>
                    )}
                  </div>
                  {t.championTeam && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Campeón: </span>
                      <span className="font-semibold">{t.championTeam.name}</span>
                    </div>
                  )}
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/t/${t.slug}`}>
                      Ver campeonato <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 py-8 sm:grid-cols-3">
        {[
          { icon: <MapPin className="size-5" />, title: "Fixture inteligente", desc: "Round-robin con idas y vueltas, llaves y tercer puesto. Horarios y canchas automáticos." },
          { icon: <Trophy className="size-5" />, title: "Marcador en vivo", desc: "Eventos en tiempo real desde el celular del operador, con respaldo por polling." },
          { icon: <Clock className="size-5" />, title: "Tablas y actas", desc: "Posiciones con tie-breakers oficiales y actas en PDF listas para imprimir." },
        ].map((f) => (
          <Card key={f.title} className="gap-2">
            <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {f.icon}
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}