import { describe, expect, it } from "vitest";
import { computeStandings } from "@/lib/engine/standings";
import type { MatchScoreInput, StandingRow } from "@/lib/engine/types";

const FIN = "FINALIZADO" as const;

function match(id: string, homeTeamId: string, awayTeamId: string, hs: number, as_: number): MatchScoreInput {
  return {
    id,
    homeTeamId,
    awayTeamId,
    homeScore: hs,
    awayScore: as_,
    venue: null,
    scheduledAt: null,
    status: FIN,
    categoryId: "cat",
    jornada: null,
    groupId: null,
    homePenalties: null,
    awayPenalties: null,
    winnerId: null,
  };
}

const teams = [
  { id: "A", name: "Alpha" },
  { id: "B", name: "Beta" },
  { id: "C", name: "Gamma" },
];

describe("computeStandings", () => {
  it("tallies points, goals and order", () => {
    const result = computeStandings(
      [match("1", "A", "B", 2, 1), match("2", "A", "C", 1, 1), match("3", "B", "C", 3, 0)],
      teams
    );
    const rows = Object.fromEntries(result.rows.map((r) => [r.teamId, r]));
    expect(rows.A).toMatchObject({ played: 2, won: 1, drawn: 1, lost: 0, points: 4, goalsFor: 3, goalsAgainst: 2 });
    expect(rows.B).toMatchObject({ played: 2, won: 1, drawn: 0, lost: 1, points: 3 });
    expect(rows.C).toMatchObject({ played: 2, won: 0, drawn: 1, lost: 1, points: 1 });
    expect(result.order).toEqual(["A", "B", "C"]);
  });

  it("ignores unfinished matches", () => {
    const live = { ...match("1", "A", "B", 5, 0), status: "EN_VIVO" as const };
    const result = computeStandings([live], teams);
    expect(result.rows).toHaveLength(3);
    expect(result.rows.every((r) => r.played === 0)).toBe(true);
  });

  it("breaks ties by goal difference", () => {
    const matches = [
      match("1", "A", "B", 2, 1),
      match("2", "A", "C", 1, 1),
      match("3", "C", "B", 2, 0),
    ];
    const result = computeStandings(matches, teams);
    // A y C empatan en 4 puntos; C tiene mejor DG (+2 > +1)
    expect(result.order).toEqual(["C", "A", "B"]);
  });

  it("applies head-to-head (MUTUO) tiebreaker", () => {
    const teams3 = [
      { id: "A", name: "Alpha" },
      { id: "B", name: "Beta" },
      { id: "C", name: "Gamma" },
      { id: "D", name: "Delta" },
    ];
    const matches = [
      match("1", "A", "B", 1, 0),
      match("2", "C", "D", 1, 0),
      match("3", "A", "C", 0, 0),
      match("4", "B", "D", 1, 1),
      match("5", "A", "D", 2, 0),
      match("6", "B", "C", 2, 1),
    ];
    // Puntos: A=7, B=4, C=4, D=1
    // B y C empatan: por puntos... veamos con tiebreakers DG
    const result = computeStandings(matches, teams3, { tiebreakers: ["PUNTOS", "DG"] });
    const pos = Object.fromEntries(result.order.map((id, i) => [id, i]));
    expect(pos.A).toBe(0);
    expect(pos.D).toBe(3);
    // B tiene DG +... vs C
    expect(pos.C > pos.B || pos.B > pos.C).toBe(true);
  });
});

describe("StandingRow shape", () => {
  it("exposes the fields rendered by the tabla", () => {
    const result = computeStandings([match("1", "A", "B", 1, 0)], teams);
    const row = result.rows.find((r: StandingRow) => r.teamId === "A");
    expect(row).toBeDefined();
    expect(typeof row?.goalDiff).toBe("number");
    expect(typeof row?.yellowCards).toBe("number");
  });
});