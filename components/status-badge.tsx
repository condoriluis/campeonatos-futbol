import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";

const labels: Record<string, string> = {
  BORRADOR: "Borrador",
  INSCRIPCION: "Inscripciones",
  EN_PROGRESO: "En curso",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
  PENDIENTE: "Pendiente",
  PROGRAMADO: "Programado",
  EN_VIVO: "En vivo",
  DESCANSO: "Descanso",
  FINALIZADO_MATCH: "Finalizado",
};

export type StatusName =
  | "BORRADOR"
  | "INSCRIPCION"
  | "EN_PROGRESO"
  | "FINALIZADO"
  | "CANCELADO"
  | "PENDIENTE"
  | "PROGRAMADO"
  | "EN_VIVO"
  | "DESCANSO";

export function StatusBadge({
  status,
  className,
  ...props
}: { status: string } & ComponentProps<typeof Badge>) {
  const variant = statusBadgeVariant(status);
  return (
    <Badge variant={variant} className={className} {...props}>
      {labels[status] ?? status}
    </Badge>
  );
}

function statusBadgeVariant(status: string) {
  if (status === "FINALIZADO" || status === "FINALIZADO_MATCH") return "secondary";
  if (status === "EN_VIVO" || status === "EN_PROGRESO") return "success";
  if (status === "PENDIENTE" || status === "PROGRAMADO" || status === "DESCANSO") return "warning";
  return "outline";
}