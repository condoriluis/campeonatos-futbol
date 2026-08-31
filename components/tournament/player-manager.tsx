"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import { playerSchema, type PlayerInput } from "@/lib/validations/entities";
import { parseRoster } from "@/lib/roster";
import { createPlayer, updatePlayer, deletePlayer, togglePlayerStatus, bulkCreatePlayers } from "@/lib/actions/player-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
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
import { Card, CardContent } from "@/components/ui/card";

export type PlayerRow = {
  id: string;
  name: string;
  jerseyNumber: number | null;
  position: string | null;
  status: string;
  isCaptain: boolean;
};

export function PlayerManager({ teamId, teamName, players }: { teamId: string; teamName: string; players: PlayerRow[] }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{teamName}</h2>
        <div className="flex items-center gap-2">
          <BulkDialog teamId={teamId} onDone={() => { toast.success("Nómina cargada"); refresh(); }} />
          <PlayerFormDialog
            teamId={teamId}
            onSubmit={async (v) => {
              const res = await createPlayer({ ...v, teamId });
              if (!res.success) {
                toast.error(res.error ?? "No se pudo crear");
                return false;
              }
              toast.success("Jugador agregado");
              refresh();
              return true;
            }}
          />
        </div>
      </div>

      {players.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <UsersRound className="text-muted-foreground mx-auto mb-2 size-8" />
            <p className="text-muted-foreground text-sm">Aún no hay jugadores. Agrégalos uno a uno o por nómina.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {players.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-bold">
                {p.jerseyNumber ?? "—"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {p.name}
                  {p.isCaptain && <span className="text-primary ml-1 text-xs">(C)</span>}
                </p>
                <p className="text-muted-foreground text-xs">
                  {p.position || "—"} · {p.status === "HABILITADO" ? "Habilitado" : "Inhabilitado"}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={async () => { await togglePlayerStatus(p.id); refresh(); }}>
                {p.status === "HABILITADO" ? "Inhabilitar" : "Habilitar"}
              </Button>
              <PlayerFormDialog
                teamId={teamId}
                initial={p}
                onSubmit={async (v) => {
                  const res = await updatePlayer(p.id, v);
                  if (!res.success) {
                    toast.error(res.error ?? "No se pudo actualizar");
                    return false;
                  }
                  toast.success("Jugador actualizado");
                  refresh();
                  return true;
                }}
              />
              <DeletePlayerButton
                id={p.id}
                name={p.name}
                onDeleted={() => { toast.success("Jugador eliminado"); refresh(); }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerFormDialog({
  teamId,
  initial,
  onSubmit,
}: {
  teamId: string;
  initial?: { name: string; jerseyNumber: number | null; position: string | null; isCaptain: boolean };
  onSubmit: (v: PlayerInput) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PlayerInput>({
    resolver: zodResolver(playerSchema) as Resolver<PlayerInput>,
    defaultValues: initial
      ? { teamId, name: initial.name, jerseyNumber: initial.jerseyNumber ?? undefined, position: initial.position ?? "", isCaptain: initial.isCaptain }
      : { teamId, name: "", jerseyNumber: undefined, position: "", isCaptain: false },
  });

  const onSave = handleSubmit(async (values) => {
    setLoading(true);
    const okRes = await onSubmit(values);
    setLoading(false);
    if (okRes) {
      setOpen(false);
      reset();
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {initial ? (
          <Button variant="ghost" size="icon" aria-label="Editar">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" /> Nuevo jugador
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar jugador" : "Nuevo jugador"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Nombre *</Label>
            <Input placeholder="Nombre y apellido" {...register("name")} />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>N° camiseta</Label>
              <Input type="number" min={0} max={99} {...register("jerseyNumber")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Posición</Label>
              <Input placeholder="Arquero" {...register("position")} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" {...register("isCaptain")} /> Es capitán
          </label>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BulkDialog({ teamId, onDone }: { teamId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const onSave = async () => {
    setLoading(true);
    const players = parseRoster(text).map((p) => ({
      name: p.name,
      jerseyNumber: p.jerseyNumber,
      position: p.position,
    }));
    if (players.length === 0) {
      toast.error("Ingresa al menos una línea");
      setLoading(false);
      return;
    }
    const res = await bulkCreatePlayers({ teamId, players });
    setLoading(false);
    if (!res.success) {
      toast.error(res.error ?? "No se pudo cargar");
      return;
    }
    setOpen(false);
    setText("");
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UsersRound className="size-4" /> Cargar nómina
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cargar nómina completa</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label>Una por línea. Se acepta nombre, dorsal (#) y posición, con guion corto (-), largo (–) o em (—).</Label>
          <Textarea
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Juan Perez #1 - Arquero\nCarlos Rojas #7 – Cierre"}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={onSave} disabled={loading}>
            {loading ? "Cargando…" : "Cargar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeletePlayerButton({ id, name, onDeleted }: { id: string; name: string; onDeleted: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Eliminar">
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Quitar a {name}?</AlertDialogTitle>
          <AlertDialogDescription>Se eliminará del equipo para siempre.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              const res = await deletePlayer(id);
              if (!res.success) {
                toast.error(res.error ?? "No se pudo eliminar");
                return;
              }
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