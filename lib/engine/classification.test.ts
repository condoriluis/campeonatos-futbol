import { describe, expect, it } from "vitest";
import { classifyFromGroups } from "@/lib/engine/classification";
import type { StandingRow } from "@/lib/engine/types";

function row(teamId: string, teamName: string, position: number, points: number, goalDiff = 0, goalsFor = 0): StandingRow {
  return {
    teamId,
    teamName,
    position,
    played: 3,
    won: position === 1 ? 2 : 1,
    drawn: 1,
    lost: 0,
    goalsFor,
    goalsAgainst: goalsFor - goalDiff,
    goalDiff,
    points,
    yellowCards: 0,
    redCards: 0,
  };
}

describe("classifyFromGroups", () => {
  const groups = [
    {
      name: "A",
      rows: [row("a1", "Alpha", 1, 9, 5, 8), row("a2", "Beta", 2, 6, 2, 5), row("a3", "Gamma", 3, 4, 0, 4)],
    },
    {
      name: "B",
      rows: [row("b1", "Delta", 1, 9, 4, 7), row("b2", "Epsilon", 2, 5, 1, 4), row("b3", "Zeta", 3, 6, 1, 5)],
    },
  ];

  it("picks the top 1 and 2 of each group plus best third", () => {
    const { qualifiers } = classifyFromGroups(groups, { classifyPerGroup: 2, bestThirds: 1 });
    const ids = qualifiers.map((q) => q.teamId);
    expect(ids).toContain("a1");
    expect(ids).toContain("a2");
    expect(ids).toContain("b1");
    expect(ids).toContain("b2");
    // best third: Zeta (6 pts) > Gamma (4 pts)
    expect(ids).toContain("b3");
    expect(ids).not.toContain("a3");
  });

  it("orders qualifiers in crossing order: firsts then seconds then best thirds", () => {
    const { qualifiers } = classifyFromGroups(groups, { classifyPerGroup: 2, bestThirds: 1 });
    const categories = qualifiers.map((q) => q.label);
    expect(categories[0]).toBe("1A");
    expect(categories[1]).toBe("1B");
    expect(categories[2]).toBe("2A");
    expect(categories[3]).toBe("2B");
  });

  it("returns classified teams per group", () => {
    const { groupsData } = classifyFromGroups(groups, { classifyPerGroup: 2, bestThirds: 0 });
    expect(groupsData[0].classified).toEqual(["a1", "a2"]);
    expect(groupsData[1].classified).toEqual(["b1", "b2"]);
  });
});