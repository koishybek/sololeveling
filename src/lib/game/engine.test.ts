import { describe, expect, it } from "vitest";
import type { DailyGoal, LogEntry, Meal } from "@/lib/db/types";
import {
  computeGame,
  dailyQuests,
  dayXp,
  levelFromXp,
  rankFromLevel,
} from "./engine";

let counter = 0;
function entry(p: Partial<LogEntry>): LogEntry {
  counter += 1;
  return {
    id: `e${counter}`,
    date: "2026-06-25",
    meal: "lunch",
    foodId: "f",
    foodName: "x",
    grams: 100,
    kcal: 100,
    proteinG: 10,
    carbG: 10,
    fatG: 5,
    dbSource: "usda",
    correctionMade: false,
    isWholeFood: false,
    createdAt: 0,
    ...p,
  };
}

const goal: DailyGoal = { date: "", kcal: 2000, proteinG: 150, carbG: 200, fatG: 67 };

describe("dailyQuests", () => {
  it("marks the protein quest done at >=90% of target", () => {
    const qs = dailyQuests([entry({ proteinG: 140 })], goal);
    expect(qs.find((q) => q.key === "protein")?.done).toBe(true);
  });

  it("marks all-meals done only with breakfast+lunch+dinner", () => {
    const meals: Meal[] = ["breakfast", "lunch", "dinner"];
    const qs = dailyQuests(
      meals.map((m) => entry({ meal: m })),
      goal,
    );
    expect(qs.find((q) => q.key === "meals")?.done).toBe(true);
  });

  it("rewards corrections (INT) and whole foods (INT)", () => {
    const qs = dailyQuests(
      [entry({ correctionMade: true, isWholeFood: true })],
      goal,
    );
    expect(qs.find((q) => q.key === "correct")?.done).toBe(true);
    expect(qs.find((q) => q.key === "whole")?.done).toBe(true);
  });
});

describe("levels and ranks", () => {
  it("levels up every 100 XP", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(450)).toBe(5);
  });

  it("maps levels to ranks E→S", () => {
    expect(rankFromLevel(1)).toBe("E");
    expect(rankFromLevel(5)).toBe("D");
    expect(rankFromLevel(10)).toBe("C");
    expect(rankFromLevel(15)).toBe("B");
    expect(rankFromLevel(20)).toBe("A");
    expect(rankFromLevel(25)).toBe("S");
  });
});

describe("computeGame", () => {
  it("aggregates XP, stats and streak across days", () => {
    const today = "2026-06-25";
    const yesterday = "2026-06-24";
    const mkDay = (date: string): LogEntry[] => [
      entry({ date, meal: "breakfast", proteinG: 60, isWholeFood: true }),
      entry({ date, meal: "lunch", proteinG: 60, correctionMade: true }),
      entry({ date, meal: "dinner", proteinG: 40 }),
    ];
    const entries = [...mkDay(today), ...mkDay(yesterday)];

    const view = computeGame({
      entries,
      goal,
      weights: [{ date: yesterday, weightKg: 100 }],
      today,
      startWeightKg: 100,
    });

    // each day: meals✓ protein(160>=135)✓ cap(300<=2000)✓ correct✓ whole✓ = 5 quests
    expect(dayXp(view.todayQuests)).toBe(100);
    expect(view.totalXp).toBe(200); // two full days
    expect(view.level).toBe(3);
    expect(view.streak).toBe(2);
    expect(view.penaltyActive).toBe(false);
    expect(view.stats.str).toBe(2); // protein hit both days
  });

  it("flags a penalty when nothing is logged today but history exists", () => {
    const view = computeGame({
      entries: [entry({ date: "2026-06-20", meal: "lunch" })],
      goal,
      weights: [],
      today: "2026-06-25",
      startWeightKg: 100,
    });
    expect(view.penaltyActive).toBe(true);
  });

  it("computes weight gates", () => {
    const view = computeGame({
      entries: [],
      goal,
      weights: [{ date: "2026-06-25", weightKg: 93 }],
      today: "2026-06-25",
      startWeightKg: 100,
    });
    expect(view.gates.find((g) => g.rank === "D")?.reached).toBe(true); // 93 <= 95
    expect(view.gates.find((g) => g.rank === "C")?.reached).toBe(false); // 93 > 90
    expect(view.nextGate?.rank).toBe("C");
  });
});
