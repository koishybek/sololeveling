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
  /** Thumbnail: a remote image URL or a data: URL captured from a photo. */
  imageUrl?: string;
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
  /** Denormalized thumbnail snapshot for fast diary rendering. */
  imageUrl?: string;
  // ── legacy RPG signals, still captured (inert since the Calora pivot) ──
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

export type HabitStat = "STR" | "INT" | "WIL";
export type HabitKind = "bool" | "count";

/** A custom daily quest (habit) beyond food — steps, coding, no-PMO, etc. */
export interface Habit {
  id: string;
  name: string;
  emoji: string;
  stat: HabitStat;
  kind: HabitKind;
  target?: number; // for count habits (e.g. 10000 steps, 2 hours)
  unit?: string;
  xp: number;
  archived: boolean;
  order: number;
  createdAt: number;
}

/** Per-day completion record for a habit. id = `${date}__${habitId}`. */
export interface HabitLog {
  id: string;
  date: string;
  habitId: string;
  value: number;
  done: boolean;
}

/** An AI-generated personalized bonus quest issued by the "System". */
export interface SystemBonusQuest {
  title: string;
  detail: string;
  xp: number;
  stat: HabitStat;
}

/** The AI "System" daily feed: in-character notices + one bonus quest.
 *  Generated once per day from the player's real data and cached here. */
export interface SystemFeed {
  date: string; // YYYY-MM-DD (primary key)
  generatedAt: number;
  notices: string[];
  bonusQuest: SystemBonusQuest | null;
  bonusDone: boolean;
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
  aiSystemModel?: string;
  waterTargetMl?: number;
  lastSeenLevel?: number;
  lastSeenRank?: string;
  remindersEnabled?: boolean;
  /** Epoch ms of the last successful JSON backup download. */
  lastBackupAt?: number;
  /** Epoch ms the backup reminder was last snoozed. */
  backupReminderSnoozedAt?: number;
  allocStr?: number;
  allocInt?: number;
  allocWil?: number;
}

export interface MealPhoto {
  id: string;
  logEntryId?: string;
  blob: Blob;
  createdAt: number;
}
