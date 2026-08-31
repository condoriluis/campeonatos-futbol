import Link from "next/link";
import { notFound } from "next/navigation";
import { Users, Trophy, Radio, MapPin } from "lucide-react";
import { getTournamentBySlug } from "@/lib/actions/tournament-actions";
import { listTournamentLive } from "@/lib/services/match-live";
import { StatusBadge } from "@/components/status-badge";
import { SportBadge } from "@/components/sport-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PublicTournamentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tournament = await getTournamentBySlug(slug);
  if (!tournament) notFound();

  const live = await listTournamentLive(tournament.id, 10);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-heading text-2xl font-bold sm:text-3xl">{tournament.name}</h1>
            <div className="flex flex-col items-end gap-1">
              <SportBadge sport={tournament.sport} />
              <StatusBadge status={tournament.status} />
            </div>
          </div>
          {tournament.description && <p className="text-muted-foreground">{tournament.description}</p>}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {tournament.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="size-4" /> {tournament.venue}
              </span>
            )}
            {tournament.city && <span>{tournament.city}</span>}
          </div>
          {tournament.categories?.some(c => c.championTeam) && (
            <div className="bg-muted/40 flex flex-col gap-2 rounded-xl border px-4 py-3">
              <div className="flex items-center gap-2">
                <Trophy className="size-5 text-amber-500" />
                <p className="font-semibold text-sm">Campeones</p>
              </div>
              <div className="flex flex-col gap-1">
                {tournament.categories.filter(c => c.championTeam).map(c => (
                  <div key={c.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{c.name}</span>
                    <span className="font-bold">{c.championTeam!.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="size-5" /> Categorías
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tournament.categories.map((c) => (
            <Card key={c.id} className="gap-2">
              <CardContent className="flex flex-col gap-1 py-4">
                <h3 className="font-semibold">{c.name}</h3>
                <p className="text-muted-foreground text-xs">
                  {c.type} · {c._count.teams} equipos
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Radio className="size-5" /> En vivo y recientes
          </h2>
        </div>
        {live.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Sin partidos en vivo por ahora.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {live.map((m) => (
              <div key={m.id} className="flex flex-col gap-2 rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{m.phase?.name}{m.group ? ` · Grupo ${m.group.name}` : ""}</span>
                  <StatusBadge status={m.status} />
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span>{m.homeTeam?.name ?? m.homeLabel ?? "—"}</span>
                  <span className="font-mono text-lg font-black">{m.homeScore ?? 0} - {m.awayScore ?? 0}</span>
                  <span>{m.awayTeam?.name ?? m.awayLabel ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{m.venue || "Sin sede"} · {formatDateTime(m.scheduledAt)}</span>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/t/${slug}/partidos/${m.id}`}>Seguir</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}