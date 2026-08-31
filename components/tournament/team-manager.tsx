"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { teamSchema, type TeamInput } from "@/lib/validations/entities";
import { createTeam, updateTeam, deleteTeam } from "@/lib/actions/team-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";

export type TeamRow = {
  id: string;
  name: string;
  color: string | null;
  shieldUrl: string | null;
  status: string;
  captainName: string | null;
  delegateName: string | null;
  _count: { players: number };
};

export type CategoryWithTeams = {
  id: string;
  name: string;
  teams: TeamRow[];
};

export function TeamManager({ tournamentId, categories }: { tournamentId: string; categories: CategoryWithTeams[] }) {
  const router = useRouter();
  const [catId, setCatId] = useState<string>(categories[0]?.id ?? "");
  const category = categories.find((c) => c.id === catId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={catId} onValueChange={setCatId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Elige categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <TeamFormDialog
            categoryId={catId}
            onSubmit={async (v) => {
              const res = await createTeam({ ...v, categoryId: catId });
              if (!res.success) {
                toast.error(res.error ?? "No se pudo crear");
                return false;
              }
              toast.success("Equipo creado");
              router.refresh();
              return true;
            }}
          />
        </div>
      </div>

      {!category ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {categories.length === 0 ? "Primero crea una categoría." : "Elige una categoría."}
          </CardContent>
        </Card>
      ) : category.teams.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay equipos en esta categoría.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {category.teams.map((t) => (
            <Card key={t.id} className="gap-3">
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    {t.shieldUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.shieldUrl} alt={t.name} className="size-8 shrink-0 rounded-lg border object-cover" />
                    ) : (
                      <span className="size-8 shrink-0 rounded-lg border" style={{ background: t.color ?? "#64748b" }} />
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{t.name}</h3>
                      {t.captainName && <p className="text-muted-foreground text-xs">Capitán: {t.captainName}</p>}
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/panel/campeonatos/${tournamentId}/equipos/${t.id}`}>
                      <Users className="size-3" /> Jugadores ({t._count.players})
                    </Link>
                  </Button>
                  <TeamFormDialog
                    categoryId={catId}
                    initial={t}
                    onSubmit={async (v) => {
                      const res = await updateTeam(t.id, v);
                      if (!res.success) {
                        toast.error(res.error ?? "No se pudo actualizar");
                        return false;
                      }
                      toast.success("Equipo actualizado");
                      router.refresh();
                      return true;
                    }}
                  />
                  <DeleteTeamButton
                    id={t.id}
                    name={t.name}
                    onDeleted={() => {
                      toast.success("Equipo eliminado");
                      router.refresh();
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamFormDialog({
  categoryId,
  initial,
  onSubmit,
}: {
  categoryId: string;
  initial?: { name: string; color: string | null; shieldUrl: string | null; captainName: string | null; delegateName: string | null; status?: string };
  onSubmit: (v: TeamInput) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TeamInput>({
    resolver: zodResolver(teamSchema) as Resolver<TeamInput>,
    defaultValues: initial
      ? ({ ...initial, categoryId, shieldUrl: initial.shieldUrl ?? "", color: initial.color ?? "", captainName: initial.captainName ?? "", delegateName: initial.delegateName ?? "" } as TeamInput)
      : { categoryId, name: "", color: "", shieldUrl: "", captainName: "", delegateName: "" },
  });

  const onSave = handleSubmit(async (values) => {
    setLoading(true);
    const okRes = await onSubmit({ ...values, shieldUrl: values.shieldUrl || "" });
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
            <Plus className="size-4" /> Nuevo equipo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar equipo" : "Nuevo equipo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Nombre *</Label>
            <Input placeholder="Los Halcones FC" {...register("name")} />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Color</Label>
              <Input type="color" className="h-9 p-1" {...register("color")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Escudo (URL)</Label>
              <Input placeholder="https://…" {...register("shieldUrl")} />
              {errors.shieldUrl && <p className="text-destructive text-xs">{errors.shieldUrl.message}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Delegado</Label>
              <Input {...register("delegateName")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Capitán</Label>
              <Input {...register("captainName")} />
            </div>
          </div>
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

function DeleteTeamButton({ id, name, onDeleted }: { id: string; name: string; onDeleted: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Eliminar">
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar {name}?</AlertDialogTitle>
          <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              const res = await deleteTeam(id);
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