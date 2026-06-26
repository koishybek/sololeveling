import type { ActivityLevel, Goal, Macros, MacroSplit, Sex } from "./types";

/** TDEE multipliers per activity level. */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extreme: 1.9,
};

/** ~7700 kcal ≈ 1 kg of body fat. */
export const KCAL_PER_KG_FAT = 7700;

/** Calories per gram of each macronutrient (Atwater). */
export const KCAL_PER_G = { protein: 4, carb: 4, fat: 9 } as const;

/** Sensible default macro split (30% protein / 40% carb / 30% fat). */
export const DEFAULT_SPLIT: MacroSplit = { protein: 0.3, carb: 0.4, fat: 0.3 };

/** Basal Metabolic Rate via the Mifflin-St Jeor equation. */
export function mifflinStJeorBMR(p: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === "male" ? base + 5 : base - 161;
}

/** Total Daily Energy Expenditure = BMR × activity factor. */
export function tdee(bmr: number, activity: ActivityLevel): number {
  return bmr * ACTIVITY_FACTORS[activity];
}

/**
 * Daily calorie target given a goal. `dailyAdjustmentKcal` is the magnitude of
 * the deficit (lose) or surplus (gain); ignored for maintain.
 */
export function goalCalories(
  tdeeVal: number,
  goal: Goal,
  dailyAdjustmentKcal = 500,
): number {
  if (goal === "maintain") return tdeeVal;
  const delta = Math.abs(dailyAdjustmentKcal);
  return goal === "lose" ? tdeeVal - delta : tdeeVal + delta;
}

/** kg of fat change per week for a given daily calorie deficit/surplus. */
export function weeklyWeightChangeKg(dailyDeficitKcal: number): number {
  return (dailyDeficitKcal * 7) / KCAL_PER_KG_FAT;
}

/** Weeks needed to move from current to target weight at the given daily delta. */
export function weeksToGoal(
  currentKg: number,
  targetKg: number,
  dailyDeficitKcal: number,
): number {
  const rate = Math.abs(weeklyWeightChangeKg(dailyDeficitKcal));
  if (rate === 0) return Infinity;
  return Math.abs(currentKg - targetKg) / rate;
}

/** Projected calendar date to reach the target weight. */
export function projectedGoalDate(
  from: Date,
  currentKg: number,
  targetKg: number,
  dailyDeficitKcal: number,
): Date {
  const weeks = weeksToGoal(currentKg, targetKg, dailyDeficitKcal);
  const d = new Date(from);
  if (!Number.isFinite(weeks)) return d;
  d.setDate(d.getDate() + Math.round(weeks * 7));
  return d;
}

/** Convert a calorie target into gram targets per macro. */
export function macrosFromCalories(
  kcal: number,
  split: MacroSplit = DEFAULT_SPLIT,
): Macros {
  return {
    kcal: Math.round(kcal),
    proteinG: Math.round((kcal * split.protein) / KCAL_PER_G.protein),
    carbG: Math.round((kcal * split.carb) / KCAL_PER_G.carb),
    fatG: Math.round((kcal * split.fat) / KCAL_PER_G.fat),
  };
}

export interface PlanInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activity: ActivityLevel;
  goal: Goal;
  dailyAdjustmentKcal?: number;
  split?: MacroSplit;
}

export interface Plan {
  bmr: number;
  tdee: number;
  goalKcal: number;
  macros: Macros;
  /** kg/week toward the goal (0 for maintain). */
  weeklyRateKg: number;
}

/** Full plan from onboarding inputs: BMR → TDEE → goal calories → macros. */
export function computePlan(input: PlanInput): Plan {
  const bmr = mifflinStJeorBMR(input);
  const tdeeVal = tdee(bmr, input.activity);
  const adjustment =
    input.goal === "maintain" ? 0 : input.dailyAdjustmentKcal ?? 500;
  const goalKcal = goalCalories(tdeeVal, input.goal, adjustment);
  const macros = macrosFromCalories(goalKcal, input.split ?? DEFAULT_SPLIT);
  const weeklyRateKg =
    input.goal === "maintain" ? 0 : weeklyWeightChangeKg(adjustment);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdeeVal),
    goalKcal: macros.kcal,
    macros,
    weeklyRateKg,
  };
}
