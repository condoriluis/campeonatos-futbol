import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ExternalLink } from "lucide-react";
import { getTournamentById } from "@/lib/actions/tournament-actions";
import { TournamentTabs } from "@/components/tournament/tournament-tabs";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function TournamentDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const tournament = await getTournamentById(id);
  if (!tournament) notFound();

  const access = await db.tournament.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  const isEditor = session.user.role === "ADMIN" || (session.user.role === "ORGANIZADOR" && access?.ownerId === session.user.id);
  if (!isEditor && session.user.role !== "OPERADOR") redirect("/panel");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">{tournament.name}</h1>
            <p className="text-muted-foreground text-sm">
              {tournament.city || tournament.venue || "Sin sede"} ·{" "}
              {tournament.startDate ? new Date(tournament.startDate).toLocaleDateString("es") : "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={tournament.status} />
            {tournament.slug && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/t/${tournament.slug}`}>
                  <ExternalLink className="size-3" /> Público
                </Link>
              </Button>
            )}
          </div>
        </div>
        <TournamentTabs tournamentId={id} />
      </div>
      {children}
    </div>
  );
}