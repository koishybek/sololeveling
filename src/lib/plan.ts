import { dayKey } from "@/lib/db/repo";
import type { DailyGoal, Profile } from "@/lib/db/types";
import { computePlan } from "@/lib/nutrition/calories";

/** Derive today's calorie/macro goal from the stored profile. */
export function goalFromProfile(p: Profile): DailyGoal {
  const plan = computePlan({
    sex: p.sex,
    age: p.age,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    targetWeightKg: p.targetWeightKg,
    activity: p.activity,
    goal: p.goal,
    dailyAdjustmentKcal: p.dailyAdjustmentKcal,
  });
  return {
    date: dayKey(),
    kcal: plan.goalKcal,
    proteinG: plan.macros.proteinG,
    carbG: plan.macros.carbG,
    fatG: plan.macros.fatG,
  };
}
