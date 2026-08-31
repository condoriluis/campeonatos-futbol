export const SPORTS = ["FUTBOL", "FUTSAL", "MINIFUTBOL", "OTRO"] as const;

export type Sport = (typeof SPORTS)[number];

export const SPORT_LABELS: Record<Sport, string> = {
  FUTBOL: "Fútbol",
  FUTSAL: "Futsal",
  MINIFUTBOL: "Minifútbol",
  OTRO: "Otro",
};

export const SPORT_OPTIONS = SPORTS.map((value) => ({ value, label: SPORT_LABELS[value] }));