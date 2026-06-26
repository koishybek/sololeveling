import { db } from "./db";
import { newId } from "@/lib/id";
import type {
  AppSettings,
  DailyGoal,
  FoodItem,
  LogEntry,
  Macros100g,
  Meal,
  Profile,
  WaterEntry,
  WeightEntry,
} from "./types";

/** Scale per-100g macros to a serving size in grams. */
export function scaleMacros(per100g: Macros100g, grams: number): Macros100g {
  const f = grams / 100;
  return {
    kcal: Math.round(per100g.kcal * f),
    proteinG: Math.round(per100g.proteinG * f),
    carbG: Math.round(per100g.carbG * f),
    fatG: Math.round(per100g.fatG * f),
  };
}

/** Local-timezone YYYY-MM-DD key. */
export function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function upsertFood(
  food: Omit<FoodItem, "id" | "createdAt"> & { id?: string },
): Promise<FoodItem> {
  const item: FoodItem = {
    ...food,
    id: food.id ?? newId(),
    createdAt: Date.now(),
  };
  await db.foods.put(item);
  return item;
}

export async function addLogEntry(params: {
  food: FoodItem;
  grams: number;
  meal: Meal;
  date?: string;
  correctionMade?: boolean;
}): Promise<LogEntry> {
  const macros = scaleMacros(params.food.per100g, params.grams);
  const entry: LogEntry = {
    id: newId(),
    date: params.date ?? dayKey(),
    meal: params.meal,
    foodId: params.food.id,
    foodName: params.food.name,
    grams: params.grams,
    ...macros,
    dbSource: params.food.source,
    correctionMade: params.correctionMade ?? false,
    isWholeFood: params.food.isWholeFood,
    createdAt: Date.now(),
  };
  await db.logEntries.add(entry);
  return entry;
}

export async function getEntriesForDate(date: string): Promise<LogEntry[]> {
  return db.logEntries.where("date").equals(date).sortBy("createdAt");
}

export async function deleteLogEntry(id: string): Promise<void> {
  await db.logEntries.delete(id);
}

export interface DayTotals {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
}

export function sumEntries(entries: LogEntry[]): DayTotals {
  return entries.reduce<DayTotals>(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      proteinG: acc.proteinG + e.proteinG,
      carbG: acc.carbG + e.carbG,
      fatG: acc.fatG + e.fatG,
    }),
    { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 },
  );
}

export async function getProfile(): Promise<Profile | undefined> {
  return db.profile.get("me");
}

export async function saveProfile(p: Profile): Promise<void> {
  await db.profile.put(p);
}

export async function setDailyGoal(goal: DailyGoal): Promise<void> {
  await db.dailyGoals.put(goal);
}

export async function getDailyGoal(
  date: string,
): Promise<DailyGoal | undefined> {
  return db.dailyGoals.get(date);
}

export async function addWeight(entry: WeightEntry): Promise<void> {
  await db.weights.put(entry);
}

export async function getWeights(): Promise<WeightEntry[]> {
  return db.weights.orderBy("date").toArray();
}

/** Recent distinct foods for the "one-tap re-log" surface. */
export async function getRecentFoods(limit = 12): Promise<FoodItem[]> {
  const recent = await db.logEntries
    .orderBy("createdAt")
    .reverse()
    .limit(60)
    .toArray();
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const e of recent) {
    if (!seen.has(e.foodId)) {
      seen.add(e.foodId);
      ids.push(e.foodId);
    }
    if (ids.length >= limit) break;
  }
  const foods = await db.foods.bulkGet(ids);
  return foods.filter((f): f is FoodItem => Boolean(f));
}

// ── editing log entries ──

/** Edit a logged entry; scales macros proportionally when grams change. */
export async function updateLogEntry(
  id: string,
  patch: { grams?: number; meal?: Meal },
): Promise<void> {
  const e = await db.logEntries.get(id);
  if (!e) return;
  const upd: Partial<LogEntry> = {};
  if (patch.meal) upd.meal = patch.meal;
  if (patch.grams && patch.grams > 0 && patch.grams !== e.grams) {
    const f = patch.grams / e.grams;
    upd.grams = patch.grams;
    upd.kcal = Math.round(e.kcal * f);
    upd.proteinG = Math.round(e.proteinG * f);
    upd.carbG = Math.round(e.carbG * f);
    upd.fatG = Math.round(e.fatG * f);
    upd.correctionMade = true;
  }
  if (Object.keys(upd).length) await db.logEntries.update(id, upd);
}

// ── favorites ──

export async function toggleFavorite(foodId: string): Promise<void> {
  const f = await db.foods.get(foodId);
  if (f) await db.foods.update(foodId, { favorite: !f.favorite });
}

export async function getFavorites(limit = 24): Promise<FoodItem[]> {
  const all = await db.foods.toArray();
  return all.filter((f) => f.favorite).slice(0, limit);
}

// ── water ──

export async function addWater(ml: number, date = dayKey()): Promise<void> {
  const cur = (await db.water.get(date))?.ml ?? 0;
  await db.water.put({ date, ml: Math.max(0, cur + ml) });
}

export async function getWater(date = dayKey()): Promise<number> {
  return (await db.water.get(date))?.ml ?? 0;
}

// ── backup / restore / reset ──

export interface Backup {
  version: 2;
  exportedAt: number;
  profile?: Profile;
  foods: FoodItem[];
  logEntries: LogEntry[];
  weights: WeightEntry[];
  dailyGoals: DailyGoal[];
  water: WaterEntry[];
  settings: AppSettings[];
}

/** Serialize all user data (except photos) to a JSON backup string. */
export async function exportData(): Promise<string> {
  const [profile, foods, logEntries, weights, dailyGoals, water, settings] =
    await Promise.all([
      db.profile.get("me"),
      db.foods.toArray(),
      db.logEntries.toArray(),
      db.weights.toArray(),
      db.dailyGoals.toArray(),
      db.water.toArray(),
      db.settings.toArray(),
    ]);
  const backup: Backup = {
    version: 2,
    exportedAt: Date.now(),
    profile,
    foods,
    logEntries,
    weights,
    dailyGoals,
    water,
    settings,
  };
  return JSON.stringify(backup, null, 2);
}

/** Replace all data with a backup. Throws on malformed input. */
export async function importData(json: string): Promise<void> {
  const b = JSON.parse(json) as Backup;
  if (!b || typeof b !== "object" || !Array.isArray(b.logEntries)) {
    throw new Error("Файл бэкапа повреждён или не того формата");
  }
  await db.transaction(
    "rw",
    [
      db.profile,
      db.foods,
      db.logEntries,
      db.weights,
      db.dailyGoals,
      db.water,
      db.settings,
    ],
    async () => {
      await Promise.all([
        db.profile.clear(),
        db.foods.clear(),
        db.logEntries.clear(),
        db.weights.clear(),
        db.dailyGoals.clear(),
        db.water.clear(),
        db.settings.clear(),
      ]);
      if (b.profile) await db.profile.put(b.profile);
      if (b.foods?.length) await db.foods.bulkPut(b.foods);
      if (b.logEntries?.length) await db.logEntries.bulkPut(b.logEntries);
      if (b.weights?.length) await db.weights.bulkPut(b.weights);
      if (b.dailyGoals?.length) await db.dailyGoals.bulkPut(b.dailyGoals);
      if (b.water?.length) await db.water.bulkPut(b.water);
      if (b.settings?.length) await db.settings.bulkPut(b.settings);
    },
  );
}

/** Wipe everything (full factory reset). */
export async function resetAll(): Promise<void> {
  await db.transaction(
    "rw",
    [
      db.profile,
      db.foods,
      db.logEntries,
      db.weights,
      db.dailyGoals,
      db.water,
      db.settings,
      db.mealPhotos,
    ],
    async () => {
      await Promise.all([
        db.profile.clear(),
        db.foods.clear(),
        db.logEntries.clear(),
        db.weights.clear(),
        db.dailyGoals.clear(),
        db.water.clear(),
        db.settings.clear(),
        db.mealPhotos.clear(),
      ]);
    },
  );
}
