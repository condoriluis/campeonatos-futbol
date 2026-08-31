import { describe, expect, it } from "vitest";
import { generateRoundRobin, distributeIntoGroups } from "@/lib/engine/round-robin";

describe("generateRoundRobin", () => {
  const teams = ["A", "B", "C", "D"];

  it("generates every pair exactly once in a single round", () => {
    const rounds = generateRoundRobin(teams);
    expect(rounds).toHaveLength(3);
    const pairs = rounds.flat().map((m) => [m.home, m.away].sort().join("-"));
    expect(new Set(pairs).size).toBe(6);
    expect(pairs.every((p) => teams.includes(p[0]) && teams.includes(p[2]))).toBe(true);
  });

  it("never repeats a team within a jornada", () => {
    const rounds = generateRoundRobin(teams);
    for (const round of rounds) {
      const seen = new Set<string>();
      for (const m of round) {
        expect(seen.has(m.home)).toBe(false);
        expect(seen.has(m.away)).toBe(false);
        seen.add(m.home);
        seen.add(m.away);
      }
      expect(seen.size).toBe(4);
    }
  });

  it("gives every team court time home and away in a single round", () => {
    const six = ["A", "B", "C", "D", "E", "F"];
    const rounds = generateRoundRobin(six);
    expect(rounds).toHaveLength(5);
    const seen = new Map<string, { home: number; away: number }>();
    for (const round of rounds) {
      for (const m of round) {
        const cur = seen.get(m.home) ?? { home: 0, away: 0 };
        cur.home++;
        seen.set(m.home, cur);
        const cur2 = seen.get(m.away) ?? { home: 0, away: 0 };
        cur2.away++;
        seen.set(m.away, cur2);
      }
    }
    for (const counts of seen.values()) {
      expect(counts.home).toBeGreaterThan(0);
      expect(counts.away).toBeGreaterThan(0);
      expect(counts.home + counts.away).toBe(5);
    }
  });

  it("doubles rounds for a two-leg tournament", () => {
    const rounds = generateRoundRobin(teams, 2);
    expect(rounds).toHaveLength(6);
    const pairs = rounds.flat().map((m) => [m.home, m.away].sort().join("-"));
    expect(pairs).toHaveLength(12);
    expect(new Set(pairs).size).toBe(6);
  });
});

describe("distributeIntoGroups", () => {
  it("splits teams evenly", () => {
    const teams = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const groups = distributeIntoGroups(teams, 2);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.length).sort()).toEqual([4, 4]);
    expect(groups.flat().sort()).toEqual([...teams].sort());
  });

  it("handles odd leftovers", () => {
    const teams = ["A", "B", "C", "D", "E", "F", "G"];
    const groups = distributeIntoGroups(teams, 2);
    expect(groups.map((g) => g.length).sort()).toEqual([3, 4]);
    expect(groups.flat().sort()).toEqual([...teams].sort());
  });
});