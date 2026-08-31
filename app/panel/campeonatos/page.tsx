import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTournamentsForUser } from "@/lib/actions/tournament-actions";
import { StatusBadge } from "@/components/status-badge";
import { SportBadge } from "@/components/sport-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  const tournaments = await getTournamentsForUser();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Mis campeonatos</h1>
          <p className="text-muted-foreground text-sm">Gestiona categorías, equipos, fixture y resultados.</p>
        </div>
        <Button asChild>
          <Link href="/panel/campeonatos/nuevo">Nuevo</Link>
        </Button>
      </div>

      {tournaments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No tienes campeonatos todavía.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <Card key={t.id} className="gap-3">
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{t.name}</h3>
                  <div className="flex flex-col items-end gap-1">
                    <SportBadge sport={t.sport} />
                    <StatusBadge status={t.status} />
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">
                  {(t as { city?: string | null }).city ?? (t as { venue?: string | null }).venue ?? "—"} ·{" "}
                  {(t._count?.categories ?? 0)} categorías
                </p>
                {t.championTeam && (
                  <p className="text-sm">
                    Campeón: <span className="font-semibold">{t.championTeam.name}</span>
                  </p>
                )}
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/panel/campeonatos/${t.id}`}>
                    Gestionar <ArrowRight className="size-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}