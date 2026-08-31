"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createPhase } from "@/lib/actions/phase-actions";
import type { CreatePhaseInput } from "@/lib/validations/match";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";

export type PhaseRefRow = { id: string; name: string; type: string };

export function PhaseCreateDialog({ categoryId, phases }: { categoryId: string; phases: PhaseRefRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"GRUPOS" | "LLAVES">("GRUPOS");
  const [fromPhaseId, setFromPhaseId] = useState<string>("");
  const [groupCount, setGroupCount] = useState(2);
  const [rounds, setRounds] = useState(1);
  const [classifyPerGroup, setClassifyPerGroup] = useState(2);
  const [bestThirds, setBestThirds] = useState(0);
  const [leg, setLeg] = useState<"SIMPLE" | "IDA_Y_VUELTA">("SIMPLE");
  const [includeThirdPlace, setIncludeThirdPlace] = useState(true);
  const [error, setError] = useState("");

  const reset = () => {
    setName("");
    setType("GRUPOS");
    setFromPhaseId("");
    setGroupCount(2);
    setRounds(1);
    setClassifyPerGroup(2);
    setBestThirds(0);
    setLeg("SIMPLE");
    setIncludeThirdPlace(true);
    setError("");
  };

  const onSave = async () => {
    if (name.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres");
      return;
    }
    setLoading(true);
    setError("");
    const input: CreatePhaseInput = {
      categoryId,
      name: name.trim(),
      type,
      fromPhaseId: fromPhaseId || null,
      config:
        type === "GRUPOS"
          ? { groupCount, rounds, classifyPerGroup, bestThirds }
          : { leg, includeThirdPlace },
    };
    const res = await createPhase(input);
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? "No se pudo crear la fase");
      return;
    }
    toast.success("Fase creada");
    setOpen(false);
    reset();
    router.refresh();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Nueva fase
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva fase</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Nombre *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Grupos / Llaves / Semifinales…" />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Tipo</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "GRUPOS" | "LLAVES")}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="GRUPOS">Fase de grupos</option>
              <option value="LLAVES">Llaves (eliminación directa)</option>
            </select>
          </div>

          {type === "GRUPOS" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Cantidad de grupos</Label>
                <Input type="number" min={1} max={16} value={groupCount} onChange={(e) => setGroupCount(Number(e.target.value))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Rondas</Label>
                <Input type="number" min={1} max={2} value={rounds} onChange={(e) => setRounds(Number(e.target.value))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Clasifican por grupo</Label>
                <Input type="number" min={0} max={8} value={classifyPerGroup} onChange={(e) => setClassifyPerGroup(Number(e.target.value))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Mejores terceros</Label>
                <Input type="number" min={0} max={8} value={bestThirds} onChange={(e) => setBestThirds(Number(e.target.value))} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Viene de</Label>
                <select
                  value={fromPhaseId}
                  onChange={(e) => setFromPhaseId(e.target.value)}
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                >
                  <option value="">Sin fase previa (equipos directos)</option>
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type === "GRUPOS" ? "grupos" : "llaves"})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Formato</Label>
                <select
                  value={leg}
                  onChange={(e) => setLeg(e.target.value as "SIMPLE" | "IDA_Y_VUELTA")}
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                >
                  <option value="SIMPLE">Partido único</option>
                  <option value="IDA_Y_VUELTA">Ida y vuelta</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeThirdPlace}
                  onChange={(e) => setIncludeThirdPlace(e.target.checked)}
                />
                Partido por el tercer puesto
              </label>
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={onSave} disabled={loading}>
            {loading ? "Creando…" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}