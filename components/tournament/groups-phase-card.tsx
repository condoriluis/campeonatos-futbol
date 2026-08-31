"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Dices, FileText, Save, Trash2, Users, Table } from "lucide-react";
import { assignGroups, autoDraw } from "@/lib/actions/draw-actions";
import { deletePhase } from "@/lib/actions/phase-actions";
import type { PhaseRow, TeamOption } from "@/components/tournament/types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FixtureOptionsDialog } from "@/components/tournament/fixture-options-dialog";
import { CircularProgressButton } from "@/components/tournament/phase-status";
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
import { cn } from "@/lib/utils";

export function GroupsPhaseCard({ phase, teams, tournamentId }: { phase: PhaseRow; teams: TeamOption[]; tournamentId: string }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const pending = phase.status === "PENDIENTE";
  const [assignments, setAssignments] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(phase.groups.map((g) => [g.id, g.members.map((m) => m.teamId)]))
  );
  const [saving, setSaving] = useState(false);

  const config = (phase.config ?? {}) as Record<string, unknown>;

  const assignedIds = Object.values(assignments).flat();
  const available = teams.filter((t) => !assignedIds.includes(t.id));

  const addTeam = (groupId: string, teamId: string) => {
    setAssignments((prev) => ({ ...prev, [groupId]: [...(prev[groupId] ?? []), teamId] }));
  };
  const removeTeam = (groupId: string, teamId: string) => {
    setAssignments((prev) => ({ ...prev, [groupId]: (prev[groupId] ?? []).filter((t) => t !== teamId) }));
  };

  const onSave = async () => {
    setSaving(true);
    const payload = phase.groups.flatMap((g) =>
      (assignments[g.id] ?? []).map((teamId, i) => ({ groupId: g.id, teamId, seed: i }))
    );
    const res = await assignGroups({ phaseId: phase.id, assignments: payload });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error ?? "No se pudo guardar");
      return;
    }
    toast.success("Distribución guardada");
    refresh();
  };

  const onAuto = async () => {
    const res = await autoDraw({ phaseId: phase.id });
    if (!res.success) {
      toast.error(res.error ?? "No se pudo sortear");
      return;
    }
    toast.success("Sorteo automático realizado");
    refresh();
  };

  return (
    <Card className="gap-4">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">{phase.name}</h3>
            <p className="text-muted-foreground text-xs">
              {phase.groups.length} grupos · {phase._count.matches} partidos ·{" "}
              clasifican {String(config.classifyPerGroup ?? 0)}/grupo
              {Number(config.bestThirds ?? 0) > 0 && ` + ${String(config.bestThirds)} mejores terceros`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={phase.status} />
            <CircularProgressButton phase={phase} onDone={refresh} />
          </div>
        </div>

        <Separator />

        <div className="grid gap-3 lg:grid-cols-2">
          {phase.groups.map((g) => (
            <div key={g.id} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Users className="size-4 text-muted-foreground" /> Grupo {g.name}
                </span>
                <span className="text-muted-foreground text-xs">{(assignments[g.id] ?? []).length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(assignments[g.id] ?? []).map((teamId) => {
                  const team = teams.find((t) => t.id === teamId);
                  return (
                    <span key={teamId} className="bg-muted flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
                      <span className="size-2 rounded-full" style={{ background: team?.color ?? "#0ea5e9" }} />
                      {team?.name ?? teamId}
                      {pending && (
                        <button
                          type="button"
                          className="text-muted-foreground ml-0.5 hover:text-destructive"
                          onClick={() => removeTeam(g.id, teamId)}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
              {pending && (
                <select
                  className={cn("border-input mt-2 h-8 w-full rounded-md border bg-transparent px-2 text-xs")}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) addTeam(g.id, e.target.value);
                  }}
                >
                  <option value="">+ Agregar equipo…</option>
                  {available.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>

        {pending && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onAuto} disabled={saving}>
              <Dices className="size-4" /> Sorteo automático
            </Button>
            <Button size="sm" onClick={onSave} disabled={saving}>
              <Save className="size-4" /> Guardar distribución
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <FixtureOptionsDialog
            key={`gen-${phase.status}`}
            phaseId={phase.id}
            kind="group"
            disabled={!pending}
          />
          {phase._count.matches > 0 && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/panel/campeonatos/${tournamentId}/partidos?phase=${phase.id}`}>Ver partidos</Link>
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
              <Link href={`/panel/campeonatos/${tournamentId}/tabla?phase=${phase.id}`}>
                <Table className="size-4" /> Tabla oficial
              </Link>
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