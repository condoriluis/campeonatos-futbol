"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { userCreateSchema, type UserCreateInput } from "@/lib/validations/auth";
import { createUser, updateUser } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  _count: { matchOperators: number };
};

const roleBadge: Record<string, "default" | "secondary" | "outline" | "success"> = {
  ADMIN: "default",
  ORGANIZADOR: "success",
  OPERADOR: "outline",
};

export function UserManager({ users, selfId }: { users: UserRow[]; selfId: string }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">Administra operadores y organizadores del sistema.</p>
        <CreateUserDialog onDone={() => { toast.success("Usuario creado"); refresh(); }} />
      </div>
      <div className="grid gap-2">
        {users.map((u) => (
          <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {u.name}
                {u.id === selfId && <span className="text-muted-foreground text-xs"> (tú)</span>}
              </p>
              <p className="truncate text-muted-foreground text-xs">{u.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={roleBadge[u.role] ?? "outline"}>{u.role}</Badge>
              <Badge variant={u.isActive ? "success" : "destructive"}>{u.isActive ? "Activo" : "Desactivado"}</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const res = await updateUser({ id: u.id, isActive: !u.isActive });
                  if (!res.success) {
                    toast.error(res.error ?? "No se pudo actualizar");
                    return;
                  }
                  refresh();
                }}
              >
                {u.isActive ? "Desactivar" : "Activar"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateUserDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserCreateInput>({ resolver: zodResolver(userCreateSchema) });

  const onSave = handleSubmit(async (values) => {
    setLoading(true);
    const res = await createUser(values);
    setLoading(false);
    if (!res.success) {
      toast.error(res.error ?? "No se pudo crear");
      return;
    }
    setOpen(false);
    reset();
    onDone();
  });

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
          <Plus className="size-4" /> Nuevo usuario
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Nombre *</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Email *</Label>
            <Input type="email" {...register("email")} />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Contraseña *</Label>
            <Input type="password" {...register("password")} />
            {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Rol</Label>
            <select className="border-input bg-background h-9 rounded-md border px-3 text-sm" {...register("role")}>
              <option value="ORGANIZADOR">Organizador</option>
              <option value="OPERADOR">Operador</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando…" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}