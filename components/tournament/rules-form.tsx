"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { rulesSchema, type RulesInput } from "@/lib/validations/tournament";
import { saveRules } from "@/lib/actions/rules-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const tiebreakerOptions = [
  { value: "PUNTOS", label: "Puntos" },
  { value: "MUTUO", label: "Mútuo enfrentamiento" },
  { value: "DG", label: "Diferencia de gol" },
  { value: "GF", label: "Goles a favor" },
  { value: "GC", label: "Goles en contra" },
  { value: "MENOS_TARJETAS", label: "Menos tarjetas" },
  { value: "GOLES_VISITA", label: "Goles de visita" },
  { value: "SORTEO", label: "Sorteo" },
];

export function RulesForm({ tournamentId, initial }: { tournamentId: string; initial?: RulesInput | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tiebreakers, setTiebreakers] = useState<string[]>(initial?.tiebreakers ?? ["PUNTOS", "MUTUO", "DG", "GF"]);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RulesInput>({
    resolver: zodResolver(rulesSchema) as Resolver<RulesInput>,
    defaultValues: initial ?? {},
  });

  const overtimeEnabled = useWatch({ control, name: "overtimeEnabled" });
  const penaltiesEnabled = useWatch({ control, name: "penaltiesEnabled" });

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    const res = await saveRules(tournamentId, { ...values, tiebreakers });
    setLoading(false);
    if (!res.success) {
      toast.error(res.error ?? "No se pudo guardar");
      return;
    }
    toast.success("Reglamento guardado");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Partido</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Duración (min)" {...register("durationMinutes")} />
          <NumberField label="Descanso (min)" {...register("breakMinutes")} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("overtimeEnabled")} /> Tiempo extra (prórroga)
        </label>
        {overtimeEnabled && (
          <div className="pl-6">
            <NumberField label="Tiempo extra (min)" {...register("overtimeMinutes")} />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Puntuación</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Victoria" {...register("pointsWin")} />
          <NumberField label="Empate" {...register("pointsDraw")} />
          <NumberField label="Derrota" {...register("pointsLoss")} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Penales</h3>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("penaltiesEnabled")} /> Definir por penales
        </label>
        {penaltiesEnabled && (
          <div className="flex flex-col gap-4 pl-6 sm:flex-row">
            <NumberField label="Tiros" {...register("penaltiesCount")} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("penaltiesOvertime")} /> Solo tras prórroga
            </label>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Nómina</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Mínimo jugadores" {...register("minPlayers")} />
          <NumberField label="Máximo jugadores" {...register("maxPlayers")} />
          <NumberField label="Cantidad de cambios" {...register("substitutesCount")} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Desempate (orden de criterios)</h3>
        <div className="flex flex-wrap gap-2">
          {tiebreakerOptions.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm"
            >
              <input
                type="checkbox"
                checked={tiebreakers.includes(opt.value)}
                onChange={() =>
                  setTiebreakers((prev) =>
                    prev.includes(opt.value) ? prev.filter((v) => v !== opt.value) : [...prev, opt.value]
                  )
                }
              />
              {opt.label}
            </label>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Reglas disciplinarias</h3>
        <div className="flex flex-col gap-2">
          <Label>Tarjetas y expulsiones</Label>
          <Textarea rows={3} placeholder="Descripción de reglas de tarjetas…" {...register("cardsRules")} />
        </div>
      </section>

      {errors.root && <p className="text-destructive text-sm">{errors.root.message}</p>}
      <Button type="submit" disabled={loading} className="w-fit">
        {loading ? "Guardando…" : "Guardar reglamento"}
      </Button>
    </form>
  );
}

function NumberField({ label, ...props }: { label: string } & React.ComponentProps<"input">) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={props.name}>{label}</Label>
      <Input type="number" min={0} {...props} />
    </div>
  );
}