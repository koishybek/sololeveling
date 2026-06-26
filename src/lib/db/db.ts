import Dexie, { type Table } from "dexie";
import type {
  AppSettings,
  DailyGoal,
  FoodItem,
  LogEntry,
  MealPhoto,
  Profile,
  WaterEntry,
  WeightEntry,
} from "./types";

/**
 * Local-first IndexedDB store for the E-Rank tracker.
 * Schema is kept normalized so it can later be mirrored to Supabase.
 */
export class ERankDB extends Dexie {
  profile!: Table<Profile, string>;
  foods!: Table<FoodItem, string>;
  logEntries!: Table<LogEntry, string>;
  weights!: Table<WeightEntry, string>;
  dailyGoals!: Table<DailyGoal, string>;
  settings!: Table<AppSettings, string>;
  mealPhotos!: Table<MealPhoto, string>;
  water!: Table<WaterEntry, string>;

  constructor() {
    super("erank");
    this.version(1).stores({
      profile: "id",
      foods: "id, name, source, barcode",
      logEntries: "id, date, meal, foodId, createdAt",
      weights: "date",
      dailyGoals: "date",
      settings: "id",
      mealPhotos: "id, logEntryId",
    });
    // v2: add water tracking
    this.version(2).stores({
      water: "date",
    });
  }
}

/** Singleton DB instance (browser only — guard usage in server code). */
export const db = new ERankDB();
