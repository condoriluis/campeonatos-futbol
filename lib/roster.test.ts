import { describe, expect, it } from "vitest";
import { parseRoster, parseRosterLine } from "./roster";

describe("parseRosterLine", () => {
  it("parsea nombre con número y posición usando guion corto", () => {
    expect(parseRosterLine("Juan Perez #1 - Arquero")).toEqual({
      name: "Juan Perez",
      jerseyNumber: 1,
      position: "Arquero",
    });
  });

  it("parsea con guion largo (en dash)", () => {
    expect(parseRosterLine("Juan Pérez #1 – Arquero")).toEqual({
      name: "Juan Pérez",
      jerseyNumber: 1,
      position: "Arquero",
    });
  });

  it("parsea con guion em", () => {
    expect(parseRosterLine("Juan Pérez #1 — Arquero")).toEqual({
      name: "Juan Pérez",
      jerseyNumber: 1,
      position: "Arquero",
    });
  });

  it("parsea nombre y número sin posición", () => {
    expect(parseRosterLine("Carlos Rojas #7")).toEqual({
      name: "Carlos Rojas",
      jerseyNumber: 7,
    });
  });

  it("parsea nombre y posición sin número", () => {
    expect(parseRosterLine("Luis Mendoza - Medio")).toEqual({
      name: "Luis Mendoza",
      position: "Medio",
    });
  });

  it("acepta dorsal de tres dígitos y lo limita a 99", () => {
    const p = parseRosterLine("Eduardo #100 - Delantero");
    expect(p.jerseyNumber).toBe(99);
    expect(p.name).toBe("Eduardo");
  });

  it("no divide apellidos compuestos con guión pegado", () => {
    expect(parseRosterLine("Juan Pérez-García")).toEqual({
      name: "Juan Pérez-García",
    });
  });

  it("no deja guiones sueltos al final", () => {
    expect(parseRosterLine("Andrés -")).toEqual({ name: "Andrés" });
  });

  it("limpia saltos de línea y espacios extra", () => {
    expect(parseRosterLine("\r\n  Juan Perez   #1  –  Arquero  \r\n")).toEqual({
      name: "Juan Perez",
      jerseyNumber: 1,
      position: "Arquero",
    });
  });

  it("trunca posiciones demasiado largas", () => {
    const p = parseRosterLine("Juan - Arquero extrema izquierda reserva");
    expect(p.position).toBe("Arquero extrema izqu");
  });

  it("devuelve nombre vacío para línea vacía", () => {
    expect(parseRosterLine("   ")).toEqual({ name: "" });
  });
});

describe("parseRoster", () => {
  it("parsea varias líneas y omite vacías", () => {
    const players = parseRoster("Juan Pérez #1 – Arquero\n\nCarlos Rojas #2 - Defensa");
    expect(players).toHaveLength(2);
    expect(players[0].name).toBe("Juan Pérez");
    expect(players[1].position).toBe("Defensa");
  });
});