"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, Flag } from "lucide-react";
import { updatePhaseStatus } from "@/lib/actions/phase-actions";
import type { PhaseRow } from "@/components/tournament/types";
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

export function CircularProgressButton({ phase, onDone }: { phase: PhaseRow; onDone: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const set = async (status: "PENDIENTE" | "EN_PROGRESO" | "FINALIZADO") => {
    setLoading(true);
    const res = await updatePhaseStatus(phase.id, status);
    setLoading(false);
    if (!res.success) {
      toast.error(res.error ?? "No se pudo actualizar");
      return;
    }
    toast.success("Estado actualizado");
    onDone();
    router.refresh();
  };

  if (phase.status === "PENDIENTE") {
    return (
      <Button size="sm" disabled={loading} onClick={() => set("EN_PROGRESO")}>
        <Play className="size-4" /> Comenzar
      </Button>
    );
  }

  if (phase.status === "EN_PROGRESO") {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="secondary" disabled={loading}>
            <Flag className="size-4" /> Finalizar
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Finalizar la fase {phase.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se exigirá que todos los partidos estén finalizados y se calculará el cuadro de clasificación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => set("FINALIZADO")}>Finalizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return null;
}