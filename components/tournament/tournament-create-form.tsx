"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tournamentSchema, type TournamentInput } from "@/lib/validations/tournament";
import { createTournament } from "@/lib/actions/tournament-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function TournamentCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TournamentInput>({ resolver: zodResolver(tournamentSchema) as Resolver<TournamentInput> });

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    try {
      const res = await createTournament(values);
      if (!res.success) {
        toast.error(res.error ?? "No se pudo crear el campeonato");
        return;
      }
      if (!res.data) return;
      toast.success("Campeonato creado");
      router.push(`/panel/campeonatos/${res.data.id}`);
      router.refresh();
    } catch {
      toast.error("Error al crear el campeonato");
    } finally {
      setLoading(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nombre *</Label>
        <Input id="name" placeholder="Copa Bicentenario 2026" {...register("name")} />
        {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="sport">Deporte</Label>
        <select
          id="sport"
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          defaultValue="OTRO"
          {...register("sport")}
        >
          <option value="FUTBOL">Fútbol</option>
          <option value="FUTSAL">Futsal</option>
          <option value="MINIFUTBOL">Minifútbol</option>
          <option value="OTRO">Otro</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" placeholder="Detalles del campeonato…" {...register("description")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="venue">Sede / cancha</Label>
          <Input id="venue" placeholder="Cancha La Favorita" {...register("venue")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="city">Ciudad</Label>
          <Input id="city" placeholder="Santa Cruz" {...register("city")} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startDate">Fecha de inicio</Label>
          <Input id="startDate" type="date" {...register("startDate")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endDate">Fecha de fin</Label>
          <Input id="endDate" type="date" {...register("endDate")} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="status">Estado</Label>
        <select
          id="status"
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          {...register("status")}
        >
          <option value="BORRADOR">Borrador</option>
          <option value="INSCRIPCION">Inscripciones abiertas</option>
          <option value="EN_PROGRESO">En curso</option>
        </select>
      </div>
      <Button type="submit" disabled={loading} className="mt-2">
        {loading ? "Creando…" : "Crear campeonato"}
      </Button>
    </form>
  );
}