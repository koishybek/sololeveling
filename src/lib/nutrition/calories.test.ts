import { describe, expect, it } from "vitest";
import {
  computePlan,
  goalCalories,
  macrosFromCalories,
  mifflinStJeorBMR,
  projectedGoalDate,
  tdee,
  weeklyWeightChangeKg,
  weeksToGoal,
} from "./calories";

describe("mifflinStJeorBMR", () => {
  it("computes male BMR", () => {
    // 10*100 + 6.25*180 - 5*20 + 5 = 2030
    expect(
      mifflinStJeorBMR({ sex: "male", weightKg: 100, heightCm: 180, age: 20 }),
    ).toBe(2030);
  });

  it("computes female BMR (−161 offset)", () => {
    expect(
      mifflinStJeorBMR({ sex: "female", weightKg: 100, heightCm: 180, age: 20 }),
    ).toBe(1864);
  });
});

describe("tdee", () => {
  it("applies the activity factor", () => {
    expect(tdee(2030, "sedentary")).toBeCloseTo(2436, 0);
    expect(tdee(2000, "moderate")).toBeCloseTo(3100, 0);
  });
});

describe("goalCalories", () => {
  it("subtracts a deficit when losing", () => {
    expect(goalCalories(2436, "lose", 500)).toBe(1936);
  });
  it("adds a surplus when gaining", () => {
    expect(goalCalories(2436, "gain", 300)).toBe(2736);
  });
  it("returns TDEE when maintaining", () => {
    expect(goalCalories(2436, "maintain", 500)).toBe(2436);
  });
});

describe("weight projection", () => {
  it("derives weekly fat change from a deficit", () => {
    // 500*7/7700 ≈ 0.4545 kg/week
    expect(weeklyWeightChangeKg(500)).toBeCloseTo(0.4545, 3);
  });

  it("computes weeks to goal", () => {
    // need to lose 10kg at ~0.4545 kg/week ≈ 22 weeks
    expect(weeksToGoal(100, 90, 500)).toBeCloseTo(22, 0);
  });

  it("returns Infinity weeks at zero rate", () => {
    expect(weeksToGoal(100, 90, 0)).toBe(Infinity);
  });

  it("projects a future date", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const date = projectedGoalDate(from, 100, 90, 500);
    expect(date.getTime()).toBeGreaterThan(from.getTime());
  });
});

describe("macrosFromCalories", () => {
  it("splits calories into macro grams (default 30/40/30)", () => {
    const m = macrosFromCalories(2000);
    expect(m.kcal).toBe(2000);
    expect(m.proteinG).toBe(150); // 2000*0.3/4
    expect(m.carbG).toBe(200); // 2000*0.4/4
    expect(m.fatG).toBe(67); // 2000*0.3/9 ≈ 66.7
  });
});

describe("computePlan", () => {
  it("produces a full plan for a weight-loss profile", () => {
    const plan = computePlan({
      sex: "male",
      age: 20,
      heightCm: 180,
      weightKg: 100,
      targetWeightKg: 90,
      activity: "sedentary",
      goal: "lose",
      dailyAdjustmentKcal: 500,
    });
    expect(plan.bmr).toBe(2030);
    expect(plan.tdee).toBe(2436);
    expect(plan.goalKcal).toBe(1936);
    expect(plan.weeklyRateKg).toBeCloseTo(0.4545, 3);
    expect(plan.macros.proteinG).toBeGreaterThan(0);
  });

  it("zeroes the rate for maintain", () => {
    const plan = computePlan({
      sex: "female",
      age: 30,
      heightCm: 165,
      weightKg: 60,
      targetWeightKg: 60,
      activity: "light",
      goal: "maintain",
    });
    expect(plan.weeklyRateKg).toBe(0);
    expect(plan.goalKcal).toBe(plan.tdee);
  });
});
