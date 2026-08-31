import { describe, expect, it } from "vitest";
import { computePenalties, winnerOfTie } from "@/lib/engine/penalties";

const HOME = "H";
const AWAY = "A";

function shot(order: number, team: string, converted: boolean) {
  return { order, teamId: team, converted };
}

describe("computePenalties", () => {
  it("declares the winner after the regular five shots", () => {
    const shots = [
      ...Array.from({ length: 5 }, (_, i) => shot(i, HOME, true)),
      ...Array.from({ length: 5 }, (_, i) => shot(10 + i, AWAY, i % 2 === 0)),
    ];
    const res = computePenalties(HOME, AWAY, shots);
    expect(res.finished).toBe(true);
    expect(res.winnerTeamId).toBe(HOME);
    expect(res.home.goals).toBe(5);
    expect(res.away.goals).toBe(3);
  });

  it("stops early when the advantage can no longer be caught", () => {
    const shots = [
      ...Array.from({ length: 4 }, (_, i) => shot(i, HOME, true)),
      ...Array.from({ length: 3 }, (_, i) => shot(10 + i, AWAY, false)),
    ];
    const res = computePenalties(HOME, AWAY, shots);
    expect(res.finished).toBe(true);
    expect(res.stopped).toBe(true);
    expect(res.winnerTeamId).toBe(HOME);
  });

  it("resolves draws in sudden death pairs", () => {
    const shots: ReturnType<typeof shot>[] = [];
    for (let i = 0; i < 5; i++) {
      shots.push(shot(i * 2, HOME, true));
      shots.push(shot(i * 2 + 1, AWAY, true));
    }
    shots.push(shot(100, HOME, true));
    shots.push(shot(101, AWAY, false));
    const res = computePenalties(HOME, AWAY, shots);
    expect(res.suddenDeath).toBe(true);
    expect(res.finished).toBe(true);
    expect(res.winnerTeamId).toBe(HOME);
  });
});

describe("winnerOfTie", () => {
  it("aggregates two legs", () => {
    expect(winnerOfTie(2, 1, 1, 0).winner).toBe("home");
    expect(winnerOfTie(0, 1, 1, 2).winner).toBe("away");
  });

  it("returns null when aggregate is level and no penalties", () => {
    expect(winnerOfTie(1, 1, 0, 0).winner).toBeNull();
  });

  it("uses penalties to break an aggregate tie", () => {
    const res = winnerOfTie(1, 0, 1, 2, 4, 3);
    expect(res.winner).toBe("home");
    expect(res.viaPenalties).toBe(true);
  });
});