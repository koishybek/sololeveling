import type { ActivityLevel, Goal, Sex } from "@/lib/nutrition/types";

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

/** Where a food's nutrition numbers came from. `estimate` = model-guessed. */
export type FoodSource = "usda" | "off" | "estimate" | "custom";

/** Macros per 100 g — the canonical, scale-independent storage form. */
export interface Macros100g {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
}

/** A reusable food, cached locally after a DB/AI lookup. */
export interface FoodItem {
  id: string;
  name: string;
  source: FoodSource;
  sourceId?: string;
  barcode?: string;
  brand?: string;
  per100g: Macros100g;
  isWholeFood: boolean;
  favorite?: boolean;
  createdAt: number;
}

/** A single logged serving. Macro fields are a snapshot for this serving. */
export interface LogEntry {
  id: string;
  date: string; // YYYY-MM-DD, local
  meal: Meal;
  foodId: string;
  foodName: string;
  grams: number;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  dbSource: FoodSource;
  // ── Phase 2 (RPG) signals, captured now at zero extra cost ──
  correctionMade: boolean;
  isWholeFood: boolean;
  createdAt: number;
}

export interface WeightEntry {
  date: string; // YYYY-MM-DD (primary key)
  weightKg: number;
}

export interface WaterEntry {
  date: string; // YYYY-MM-DD (primary key)
  ml: number;
}

export interface DailyGoal {
  date: string; // YYYY-MM-DD (primary key)
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
}

export interface Profile {
  id: "me";
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activity: ActivityLevel;
  goal: Goal;
  dailyAdjustmentKcal: number;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  id: "app";
  theme: "dark";
  units: "metric";
  aiVisionModel: string;
  aiTextModel?: string;
  waterTargetMl?: number;
  lastSeenLevel?: number;
  lastSeenRank?: string;
  remindersEnabled?: boolean;
}

export interface MealPhoto {
  id: string;
  logEntryId?: string;
  blob: Blob;
  createdAt: number;
}
