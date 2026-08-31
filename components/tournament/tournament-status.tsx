"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { changeTournamentStatus, deleteTournament } from "@/lib/actions/tournament-actions";
import { Button } from "@/components/ui/button";
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

const statuses = [
  { value: "BORRADOR", label: "Borrador" },
  { value: "INSCRIPCION", label: "Inscripciones" },
  { value: "EN_PROGRESO", label: "En curso" },
  { value: "FINALIZADO", label: "Finalizado" },
  { value: "CANCELADO", label: "Cancelado" },
];

export function TournamentStatusControl({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onChange = async (value: string) => {
    setLoading(true);
    try {
      const res = await changeTournamentStatus(id, { status: value });
      if (!res.success) {
        toast.error(res.error ?? "No se pudo cambiar el estado");
        return;
      }
      toast.success("Estado actualizado");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-sm">Estado:</span>
      <select
        value={status}
        disabled={loading}
        onChange={(e) => onChange(e.target.value)}
        className="border-input bg-background h-9 rounded-md border px-3 text-sm"
      >
        {statuses.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function DeleteTournamentButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    setLoading(true);
    const res = await deleteTournament(id);
    if (!res.success) {
      setLoading(false);
      toast.error(res.error ?? "No se pudo eliminar");
      return;
    }
    toast.success("Campeonato eliminado");
    router.push("/panel/campeonatos");
    router.refresh();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Eliminar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminarán categorías, equipos, partidos y todo el historial. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={loading} onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
            {loading ? "Eliminando…" : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}