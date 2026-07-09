import { describe, expect, it } from "vitest";
import type { DailyGoal, LogEntry, Meal } from "@/lib/db/types";
import { buildAnalytics, buildWeekly } from "./analytics";

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

function named(date: string, kcal: number, name: string): LogEntry {
  return { ...entry(date, kcal), foodName: name };
}

describe("buildWeekly", () => {
  it("summarises deficit days, top food and avg deviation over 7 days", () => {
    const w = buildWeekly({
      entries: [
        named("2026-06-26", 1800, "Овсянка"),
        named("2026-06-26", 300, "Кофе"),
        named("2026-06-25", 2400, "Пицца"),
        named("2026-06-24", 1900, "Овсянка"),
        named("2026-06-10", 5000, "Старое"), // outside the 7-day window → ignored
      ],
      goal,
      today: "2026-06-26",
    });
    expect(w.loggedDays).toBe(3);
    // 26th: 2100 (>2000, over), 25th: 2400 (over), 24th: 1900 (under) → 1 deficit day
    expect(w.deficitDays).toBe(1);
    expect(w.topFood).toEqual({ name: "Овсянка", count: 2 });
    // avgKcal = (2100+2400+1900)/3 = 2133 → delta +133
    expect(w.avgKcal).toBe(2133);
    expect(w.kcalDeltaAvg).toBe(133);
  });

  it("handles an empty week", () => {
    const w = buildWeekly({ entries: [], goal, today: "2026-06-26" });
    expect(w.loggedDays).toBe(0);
    expect(w.topFood).toBeNull();
    expect(w.kcalDeltaAvg).toBe(0);
  });
});
