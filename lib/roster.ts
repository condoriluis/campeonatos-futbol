const DASHES = "-–—―‐‑‒";

const NUMERIC = new RegExp(`^(.+?)\\s*#\\s*(\\d{1,3})(?:\\s*(?:[${DASHES}])\\s*(.+))?\\s*$`);

const SEPARATED = new RegExp(`^(.+?)\\s[${DASHES}]\\s(.+)\\s*$`);

const TRAILING_DASH = new RegExp(`[\\s${DASHES}]+$`);

export type RosterPlayer = {
  name: string;
  jerseyNumber?: number;
  position?: string;
};

/**
 * Interpreta una línea de nómina en cualquiera de estos formatos:
 *  "Juan Pérez #1 - Arquero" | "Juan Pérez #1 – Arquero" | "Juan Pérez #1"
 *  "Juan Pérez - Arquero"    | "Juan Pérez – Arquero"    | "Juan Pérez"
 * Acepta guiones corto (-), largo (–), em (—) y otros; normaliza espacios.
 */
export function parseRosterLine(raw: string): RosterPlayer {
  const line = raw.replace(/\r/g, "").replace(/\s+/g, " ").trim();
  if (!line) return { name: "" };

  const numeric = line.match(NUMERIC);
  if (numeric && numeric[1]) {
    const parsed: RosterPlayer = {
      name: numeric[1].trim().slice(0, 80),
      jerseyNumber: Math.min(99, Number(numeric[2])),
    };
    const position = numeric[3]?.trim();
    if (position) parsed.position = position.slice(0, 20);
    return parsed;
  }

  const separated = line.match(SEPARATED);
  if (separated && separated[1] && separated[2]) {
    return {
      name: separated[1].trim().slice(0, 80),
      position: separated[2].trim().slice(0, 20),
    };
  }

  return { name: line.replace(TRAILING_DASH, "").trim().slice(0, 80) || line.trim() };
}

export function parseRoster(text: string): RosterPlayer[] {
  return text
    .split(/\r?\n/)
    .map(parseRosterLine)
    .filter((p) => p.name.length > 0);
}