export type Sex = "male" | "female";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "very"
  | "extreme";

export type Goal = "lose" | "maintain" | "gain";

/** Absolute macro amounts for a serving or a daily target. */
export interface Macros {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
}

/** Macro fractions of total calories; should sum to ~1. */
export interface MacroSplit {
  protein: number;
  carb: number;
  fat: number;
}
