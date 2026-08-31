"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, ChevronDown, Shield } from "lucide-react";
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

const ROLES_INFO = [
  {
    role: "Administrador",
    badge: "default" as const,
    color: "bg-primary/10 text-primary",
    perms: [
      "Gestiona todos los usuarios del sistema",
      "Ve y edita cualquier campeonato",
      "Puede operar cualquier partido sin asignación",
      "Acceso total sin restricciones",
    ],
  },
  {
    role: "Organizador",
    badge: "success" as const,
    color: "bg-green-500/10 text-green-700 dark:text-green-400",
    perms: [
      "Crea y gestiona sus propios campeonatos",
      "Administra categorías, equipos y fases",
      "Puede operar cualquier partido sin asignación",
      "No puede gestionar usuarios",
    ],
  },
  {
    role: "Operador / Mesa",
    badge: "outline" as const,
    color: "bg-muted text-muted-foreground",
    perms: [
      "Opera partidos que le sean asignados",
      "Registra goles, tarjetas y eventos en vivo",
      "Ve todos los campeonatos (solo lectura)",
      "No puede crear ni editar campeonatos",
    ],
  },
];

function RolesInfo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors rounded-lg"
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <Shield className="size-4" />
          ¿Qué puede hacer cada rol?
        </span>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t px-4 pb-4 pt-3 grid gap-3 sm:grid-cols-3">
          {ROLES_INFO.map((r) => (
            <div key={r.role} className={`rounded-lg p-3 ${r.color}`}>
              <p className="font-semibold text-sm mb-2">{r.role}</p>
              <ul className="flex flex-col gap-1">
                {r.perms.map((p) => (
                  <li key={p} className="text-xs flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0">·</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function UserManager({ users, selfId }: { users: UserRow[]; selfId: string }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">Administra operadores y organizadores del sistema.</p>
        <CreateUserDialog onDone={() => { toast.success("Usuario creado"); refresh(); }} />
      </div>
      <RolesInfo />
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

/**
 * Genera un email sugerido a partir del nombre completo.
 * Ejemplos:
 *   "Carlos Mamani Quispe" → "carlosquispe@campeonatos.bo"
 *   "Juan Perez"           → "juanperez@campeonatos.bo"
 *   "Ana Maria Rodriguez Lopez" → "analopez@campeonatos.bo"
 */
function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // eliminar tildes
    .replace(/[^a-zA-Z0-9]/g, "")   // eliminar caracteres especiales
    .toLowerCase();
}

function generateEmail(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = normalize(parts[0]);
  const last = parts.length > 1 ? normalize(parts[parts.length - 1]) : "";
  const local = last ? `${first}${last}` : first;
  if (!local) return "";
  return `${local}@campeonatos.bo`;
}

function CreateUserDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserCreateInput>({ resolver: zodResolver(userCreateSchema) });

  const nameValue = watch("name", "");
  const emailValue = watch("email", "");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue("name", name);
    if (!emailTouched) {
      setValue("email", generateEmail(name));
    }
  };

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
    setEmailTouched(false);
    onDone();
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) { reset(); setEmailTouched(false); }
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
            <Label>Nombre completo *</Label>
            <Input
              value={nameValue}
              onChange={handleNameChange}
              placeholder="Carlos Mamani Quispe"
            />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={emailValue}
              {...register("email")}
              onChange={(e) => {
                setEmailTouched(true);
                setValue("email", e.target.value);
              }}
              placeholder="carlosquispe@campeonatos.bo"
            />
            {!emailTouched && emailValue && (
              <p className="text-muted-foreground text-xs">✨ Generado automáticamente — puedes editarlo</p>
            )}
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