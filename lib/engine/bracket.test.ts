import { describe, expect, it } from "vitest";
import { generateBracket, roundName } from "@/lib/engine/bracket";
import type { Qualifier } from "@/lib/engine/types";

function quals(n: number, prefix = "Q"): Qualifier[] {
  return Array.from({ length: n }, (_, i) => ({
    teamId: `${prefix}${i + 1}`,
    teamName: `${prefix}${i + 1}`,
    label: `${prefix}${i + 1}`,
  }));
}

describe("generateBracket", () => {
  it("builds a complete bracket for 8 teams", () => {
    const draft = generateBracket(quals(8), { includeThirdPlace: true });
    expect(draft.totalRounds).toBe(3);
    expect(draft.slots).toBe(8);
    // 4 cuartos + 2 semis + final + tercer puesto
    expect(draft.matches).toHaveLength(8);
    const byRound = new Map<number, typeof draft.matches>();
    for (const m of draft.matches) {
      const arr = byRound.get(m.round) ?? [];
      arr.push(m);
      byRound.set(m.round, arr);
    }
    expect(byRound.get(1)).toHaveLength(4);
    expect(byRound.get(2)).toHaveLength(2);
    expect(byRound.get(3)).toHaveLength(2);
  });

  it("skips the third-place match when disabled", () => {
    const draft = generateBracket(quals(8), { includeThirdPlace: false });
    expect(draft.matches).toHaveLength(7);
  });

  it("folds the best qualifier against the weakest in round one", () => {
    const draft = generateBracket(quals(4), { includeThirdPlace: false });
    const first = draft.matches.filter((m) => m.round === 1);
    expect(first[0].homeTeamId).toBe("Q1");
    expect(first[0].awayTeamId).toBe("Q4");
    expect(first[1].homeTeamId).toBe("Q2");
    expect(first[1].awayTeamId).toBe("Q3");
  });

  it("feeds winners into the next round", () => {
    const draft = generateBracket(quals(4), { includeThirdPlace: false });
    const semi = draft.matches.find((m) => m.round === 2);
    expect(semi?.homeFeedFrom?.round).toBe(1);
    expect(semi?.awayFeedFrom?.round).toBe(1);
  });

  it("creates byes when the field is not a power of two", () => {
    const draft = generateBracket(quals(3), { includeThirdPlace: false });
    expect(draft.slots).toBe(4);
    const first = draft.matches.filter((m) => m.round === 1);
    expect(first).toHaveLength(2);
    expect(first.some((m) => m.awayTeamId === undefined)).toBe(true);
  });

  it("keeps totalRounds coherent for a 16-team bracket", () => {
    const draft = generateBracket(quals(16), { includeThirdPlace: false });
    expect(draft.totalRounds).toBe(4);
    expect(draft.matches).toHaveLength(15);
  });
});

describe("roundName", () => {
  it("names each stage", () => {
    expect(roundName(1, 4)).toBe("Octavos");
    expect(roundName(4, 4)).toBe("Final");
  });
});