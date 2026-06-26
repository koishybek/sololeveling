import { describe, expect, it } from "vitest";
import type { DailyGoal, LogEntry, Meal } from "@/lib/db/types";
import { buildAnalytics } from "./analytics";

let n = 0;
function entry(date: string, kcal: number, proteinG = 10, meal: Meal = "lunch"): LogEntry {
  n += 1;
  return {
    id: `e${n}`,
    date,
    meal,
    foodId: "f",
    foodName: "x",
    grams: 100,
    kcal,
    proteinG,
    carbG: 0,
    fatG: 0,
    dbSource: "usda",
    correctionMade: false,
    isWholeFood: false,
    createdAt: 0,
  };
}

const goal: DailyGoal = { date: "", kcal: 2000, proteinG: 150, carbG: 200, fatG: 67 };

describe("buildAnalytics", () => {
  it("builds a series of the requested length ending today", () => {
    const a = buildAnalytics({
      entries: [entry("2026-06-26", 1800)],
      goal,
      today: "2026-06-26",
      days: 7,
    });
    expect(a.series).toHaveLength(7);
    expect(a.series[a.series.length - 1].date).toBe("2026-06-26");
    expect(a.series[a.series.length - 1].kcal).toBe(1800);
  });

  it("computes averages over logged days only", () => {
    const a = buildAnalytics({
      entries: [
        entry("2026-06-25", 1800, 120),
        entry("2026-06-26", 2200, 160),
      ],
      goal,
      today: "2026-06-26",
      days: 7,
    });
    expect(a.daysLogged).toBe(2);
    expect(a.avgKcal).toBe(2000); // (1800+2200)/2
    expect(a.avgProtein).toBe(140);
  });

  it("computes adherence (days under goal / logged days)", () => {
    const a = buildAnalytics({
      entries: [entry("2026-06-25", 1800), entry("2026-06-26", 2500)],
      goal,
      today: "2026-06-26",
      days: 7,
    });
    expect(a.adherencePct).toBe(50); // 1 of 2 under 2000
  });

  it("marks calendar states", () => {
    const a = buildAnalytics({
      entries: [entry("2026-06-25", 1800), entry("2026-06-26", 2500)],
      goal,
      today: "2026-06-26",
      calDays: 35,
    });
    const byDate = Object.fromEntries(a.calendar.map((c) => [c.date, c.state]));
    expect(byDate["2026-06-25"]).toBe("under");
    expect(byDate["2026-06-26"]).toBe("over");
    expect(byDate["2026-06-01"]).toBe("none");
  });
});
