export type ActionResult<T = unknown> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

export type StatusLabels = Record<string, string>;

export const TOURNAMENT_STATUS_LABELS: StatusLabels = {
  BORRADOR: "Borrador",
  INSCRIPCION: "Inscripción",
  EN_PROGRESO: "En progreso",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

export const MATCH_STATUS_LABELS: StatusLabels = {
  PROGRAMADO: "Programado",
  EN_VIVO: "En vivo",
  DESCANSO: "Descanso",
  FINALIZADO: "Finalizado",
  SUSPENDIDO: "Suspendido",
  CANCELADO: "Cancelado",
  ABANDONADO: "Abandonado",
};

export const TEAM_STATUS_LABELS: StatusLabels = {
  PENDIENTE: "Pendiente",
  ACTIVO: "Activo",
  SUSPENDIDO: "Suspendido",
  RETIRADO: "Retirado",
  DESCALIFICADO: "Descalificado",
};

export const CATEGORY_TYPE_LABELS: StatusLabels = {
  VARONES: "Varones",
  DAMAS: "Damas",
  MIXTO: "Mixto",
  PERSONALIZADA: "Personalizada",
};

export const PHASE_STATUS_LABELS: StatusLabels = {
  PENDIENTE: "Pendiente",
  EN_PROGRESO: "En progreso",
  FINALIZADO: "Finalizado",
};

export const EVENT_TYPE_LABELS: StatusLabels = {
  INICIO: "Inicio",
  GOL: "Gol",
  AMARILLA: "Amarilla",
  ROJA: "Roja",
  CAMBIO: "Cambio",
  PAUSA: "Pausa",
  REANUDAR: "Reanudar",
  TARDE: "Tarjeta técnica",
  FIN: "Fin",
};