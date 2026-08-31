"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  rosterCreatePlayer,
  rosterUpdatePlayer,
  rosterDeletePlayer,
} from "@/lib/actions/roster-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Plus, Trash2, UsersRound } from "lucide-react";

type Player = {
  id: string;
  name: string;
  jerseyNumber: number | null;
  position: string | null;
  document: string | null;
  isCaptain: boolean;
  status: string;
};

type PlayerForm = {
  name: string;
  jerseyNumber: string;
  position: string;
  document: string;
  isCaptain: boolean;
};

export function RosterPlayerManager({ token, teamName, initialPlayers }: {
  token: string;
  teamName: string;
  initialPlayers: Player[];
}) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div>
          <h1 className="text-lg font-bold">{teamName}</h1>
          <p className="text-xs text-muted-foreground">Gestión de nómina — delegado</p>
        </div>
        <RosterPlayerFormDialog token={token} onDone={refresh} />
      </div>

      {initialPlayers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UsersRound className="mx-auto mb-3 size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aún no hay jugadores. Agrega el primero.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {initialPlayers.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                {p.jerseyNumber ?? "—"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {p.name}
                  {p.isCaptain && <span className="ml-1.5 text-xs font-semibold text-primary">(C)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[p.position, p.document].filter(Boolean).join(" · ") || "Sin datos extra"}
                </p>
              </div>
              <RosterPlayerFormDialog token={token} initial={p} onDone={refresh} />
              <DeleteRosterPlayerButton token={token} id={p.id} name={p.name} onDeleted={refresh} />
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Acceso válido por 24 horas · Solo puedes gestionar tu propia nómina
      </p>
    </div>
  );
}

function RosterPlayerFormDialog({
  token,
  initial,
  onDone,
}: {
  token: string;
  initial?: Player;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<PlayerForm>({
    name: initial?.name ?? "",
    jerseyNumber: initial?.jerseyNumber?.toString() ?? "",
    position: initial?.position ?? "",
    document: initial?.document ?? "",
    isCaptain: initial?.isCaptain ?? false,
  });

  const set = (key: keyof PlayerForm, val: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const submit = async () => {
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return; }
    setLoading(true);
    const payload = {
      name: form.name.trim(),
      jerseyNumber: form.jerseyNumber ? Number(form.jerseyNumber) : undefined,
      position: form.position || undefined,
      document: form.document || undefined,
      isCaptain: form.isCaptain,
    };
    const res = initial
      ? await rosterUpdatePlayer(token, initial.id, payload)
      : await rosterCreatePlayer(token, payload);
    setLoading(false);
    if (!res.success) { toast.error(res.error ?? "Error al guardar"); return; }
    toast.success(initial ? "Jugador actualizado" : "Jugador agregado");
    setOpen(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {initial ? (
          <Button variant="ghost" size="icon" aria-label="Editar"><Pencil className="size-4" /></Button>
        ) : (
          <Button size="sm"><Plus className="size-4" /> Agregar jugador</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar jugador" : "Nuevo jugador"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Nombre completo *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Juan Pérez" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>N° camiseta</Label>
              <Input type="number" min={0} max={99} value={form.jerseyNumber} onChange={(e) => set("jerseyNumber", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Posición</Label>
              <Input value={form.position} onChange={(e) => set("position", e.target.value)} placeholder="Arquero" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>CI / Documento</Label>
            <Input value={form.document} onChange={(e) => set("document", e.target.value)} placeholder="12345678" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="captain" checked={form.isCaptain} onCheckedChange={(v) => set("isCaptain", !!v)} />
            <label htmlFor="captain" className="cursor-pointer select-none text-sm">Es capitán</label>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={submit} disabled={loading}>{loading ? "Guardando…" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteRosterPlayerButton({ token, id, name, onDeleted }: {
  token: string;
  id: string;
  name: string;
  onDeleted: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Eliminar"><Trash2 className="size-4" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Quitar a {name}?</AlertDialogTitle>
          <AlertDialogDescription>Se eliminará de la nómina definitivamente.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={async () => {
            const res = await rosterDeletePlayer(token, id);
            if (!res.success) { toast.error(res.error ?? "Error"); return; }
            toast.success("Jugador eliminado");
            onDeleted();
          }}>
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
