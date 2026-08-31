"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { generateGroupsFixture, generateKnockoutFixture } from "@/lib/actions/fixture-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";

export function FixtureOptionsDialog({
  phaseId,
  kind,
  allowRounds = false,
  defaultRounds = 1,
  defaultGap = 75,
  disabled = false,
}: {
  phaseId: string;
  kind: "group" | "knockout";
  allowRounds?: boolean;
  defaultRounds?: number;
  defaultGap?: number;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [gap, setGap] = useState(defaultGap);
  const [rounds, setRounds] = useState(defaultRounds);

  const onGenerate = async () => {
    setLoading(true);
    const scheduledAt = date ? new Date(`${date}T${time || "09:00"}`) : undefined;
    const input = {
      ...(allowRounds ? { rounds } : {}),
      scheduledAt,
      venue: venue || undefined,
      startTime: time || undefined,
      gapMinutes: gap,
    };
    const res =
      kind === "group"
        ? await generateGroupsFixture(phaseId, input)
        : await generateKnockoutFixture(phaseId, input);
    setLoading(false);
    if (!res.success) {
      toast.error(res.error ?? "No se pudo generar el fixture");
      return;
    }
    toast.success(`Fixture generado (${res.data?.count ?? 0} partidos)`);
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          <CalendarRange className="size-4" /> Generar fixture
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Opciones del fixture</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {allowRounds && (
            <div className="flex flex-col gap-2">
              <Label>Rondas</Label>
              <Input type="number" min={1} max={2} value={rounds} onChange={(e) => setRounds(Number(e.target.value))} />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Primer partido (fecha)</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Hora</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Cancha</Label>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Cancha 1" />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Intervalo entre partidos (min)</Label>
            <Input type="number" min={0} max={600} value={gap} onChange={(e) => setGap(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={onGenerate} disabled={loading}>
            {loading ? "Generando…" : "Generar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}