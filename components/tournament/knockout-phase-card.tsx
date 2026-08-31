"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, FileText, Trash2 } from "lucide-react";
import { deletePhase } from "@/lib/actions/phase-actions";
import { getKnockoutPreview } from "@/lib/actions/fixture-actions";
import { roundName } from "@/lib/engine/bracket";
import type { PhaseRow } from "@/components/tournament/types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FixtureOptionsDialog } from "@/components/tournament/fixture-options-dialog";
import { CircularProgressButton } from "@/components/tournament/phase-status";

type BracketDraftLike = {
  totalRounds: number;
  matches: {
    round: number;
    order: number;
    legIndex: number;
    homeLabel?: string;
    awayLabel?: string;
    homeTeamId?: string;
    awayTeamId?: string;
  }[];
};

export function KnockoutPhaseCard({ phase, tournamentId }: { phase: PhaseRow; tournamentId: string }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const pending = phase.status === "PENDIENTE";
  const config = (phase.config ?? {}) as Record<string, unknown>;
  const leg = (config.leg as string | undefined) ?? "SIMPLE";

  return (
    <Card className="gap-4">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">{phase.name}</h3>
            <p className="text-muted-foreground text-xs">
              {leg === "IDA_Y_VUELTA" ? "Ida y vuelta" : "Partido único"} · {phase._count.matches} partidos
              {phase.fromPhase ? ` · desde "${phase.fromPhase.name}"` : " · equipos directos"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={phase.status} />
            <CircularProgressButton phase={phase} onDone={refresh} />
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center gap-2">
          <BracketPreview phaseId={phase.id} />
          <FixtureOptionsDialog
            key={`gen-${phase._count.matches}-${phase.status}`}
            phaseId={phase.id}
            kind="knockout"
            disabled={!pending || phase._count.matches > 0}
          />
          {phase._count.matches > 0 && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/panel/campeonatos/${tournamentId}/partidos?phase=${phase.id}`}>Ver llaves</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={`/api/pdf/fixture/${phase.id}`} target="_blank" rel="noopener noreferrer">
                  <FileText className="size-4" /> PDF
                </a>
              </Button>
            </>
          )}
          {phase.status === "FINALIZADO" && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/panel/campeonatos/${tournamentId}/tabla?phase=${phase.id}`}>Clasificación</Link>
            </Button>
          )}
          <div className="ml-auto">
            {phase._count.matches === 0 && <DeletePhaseButton id={phase.id} name={phase.name} onDeleted={refresh} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BracketPreview({ phaseId }: { phaseId: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BracketDraftLike | null>(null);
  const [loading, setLoading] = useState(false);

  const openPreview = async (v: boolean) => {
    setOpen(v);
    if (!v) return;
    setLoading(true);
    const res = await getKnockoutPreview(phaseId);
    setDraft(res as BracketDraftLike | null);
    setLoading(false);
  };

  const rounds = draft
    ? draft.matches
        .filter((m) => m.legIndex === 0)
        .reduce<Record<number, typeof draft.matches>>((acc, m) => {
          (acc[m.round] ??= []).push(m);
          return acc;
        }, {})
    : {};

  return (
    <Dialog open={open} onOpenChange={openPreview}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={loading}>
          <Eye className="size-4" /> Vista previa del cuadro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Cuadro de llaves</DialogTitle>
        </DialogHeader>
        {!draft ? (
          <p className="text-muted-foreground text-sm">
            {loading ? "Calculando…" : "Aún no hay suficiente información (se necesitan al menos 2 clasificados)."}
          </p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Object.entries(rounds).map(([r, matches]) => (
              <div key={r} className="flex flex-col gap-2">
                <p className="text-muted-foreground text-center text-xs font-medium">
                  {roundName(Number(r), draft.totalRounds)}
                </p>
                {matches.map((m) => (
                  <div key={`${m.round}-${m.order}`} className="flex w-44 flex-col gap-1 rounded-md border p-2">
                    <p className="truncate text-xs font-medium">{m.homeLabel ?? m.homeTeamId ?? "Ganador…"}</p>
                    <p className="text-muted-foreground text-xs">vs</p>
                    <p className="truncate text-xs font-medium">{m.awayLabel ?? m.awayTeamId ?? "Ganador…"}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        <DialogClose asChild>
          <Button variant="outline" className="w-fit">
            Cerrar
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

function DeletePhaseButton({ id, name, onDeleted }: { id: string; name: string; onDeleted: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Eliminar fase">
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar la fase {name}?</AlertDialogTitle>
          <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              const res = await deletePhase(id);
              if (!res.success) {
                toast.error(res.error ?? "No se pudo eliminar");
                return;
              }
              toast.success("Fase eliminada");
              onDeleted();
            }}
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}