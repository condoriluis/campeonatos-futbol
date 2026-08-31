"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { categorySchema, type CategoryInput } from "@/lib/validations/entities";
import { createCategory, updateCategory, deleteCategory } from "@/lib/actions/category-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export type CategoryRow = {
  id: string;
  name: string;
  type: string;
  color: string | null;
  teams: { id: string; name: string; _count: { players: number } }[];
};

export function CategoryManager({ tournamentId, categories }: { tournamentId: string; categories: CategoryRow[] }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Agrega categorías (Libre, Damas, Sub-16…) y luego inscribe equipos.
        </p>
        <CategoryFormDialog
          tournamentId={tournamentId}
          onSubmit={async (v) => {
            const res = await createCategory({ ...v, tournamentId });
            if (!res.success) {
              toast.error(res.error ?? "No se pudo crear");
              return false;
            }
            toast.success("Categoría creada");
            router.refresh();
            return true;
          }}
        />
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">No hay categorías todavía.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {categories.map((c) => (
            <Card key={c.id} className="gap-3">
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="inline-block size-3 shrink-0 rounded-full" style={{ background: c.color ?? "#047857" }} />
                    <div>
                      <h3 className="font-semibold">{c.name}</h3>
                      <p className="text-muted-foreground text-xs">{c.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <CategoryFormDialog
                      tournamentId={tournamentId}
                      initial={c}
                      onSubmit={async (v) => {
                        const res = await updateCategory(c.id, v);
                        if (!res.success) {
                          toast.error(res.error ?? "No se pudo actualizar");
                          return false;
                        }
                        toast.success("Categoría actualizada");
                        router.refresh();
                        return true;
                      }}
                    />
                    <DeleteCategoryButton
                      id={c.id}
                      name={c.name}
                      disabled={c.teams.length > 0}
                      onDeleted={() => {
                        toast.success("Categoría eliminada");
                        router.refresh();
                      }}
                    />
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">{c.teams.length} equipos</p>
                {c.teams.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {c.teams.map((t) => (
                      <span key={t.id} className="bg-muted rounded-full px-2 py-0.5 text-xs">
                        {t.name} ({t._count.players})
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryFormDialog({
  tournamentId,
  initial,
  onSubmit,
}: {
  tournamentId: string;
  initial?: { id: string; name: string; type: string; color: string | null };
  onSubmit: (v: CategoryInput) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema) as Resolver<CategoryInput>,
    defaultValues: initial
      ? ({ ...initial, tournamentId, maxTeams: null, color: initial.color ?? "" } as CategoryInput)
      : { tournamentId, name: "", type: "VARONES", color: "", maxTeams: null },
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
            <Plus className="size-4" /> Nueva categoría
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Nombre *</Label>
            <Input placeholder="Libre +16" {...register("name")} />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Tipo</Label>
            <select className="border-input bg-background h-9 rounded-md border px-3 text-sm" {...register("type")}>
              <option value="VARONES">Varones</option>
              <option value="DAMAS">Damas</option>
              <option value="MIXTO">Mixto</option>
              <option value="PERSONALIZADA">Personalizada</option>
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Color</Label>
              <Input type="color" className="h-9 p-1" {...register("color")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Máx. equipos</Label>
              <Input type="number" min={0} {...register("maxTeams")} />
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

function DeleteCategoryButton({ id, name, disabled, onDeleted }: { id: string; name: string; disabled: boolean; onDeleted: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled} aria-label="Eliminar">
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {disabled ? "No se puede eliminar: tiene equipos inscritos." : "Esta acción no se puede deshacer."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              const res = await deleteCategory(id);
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