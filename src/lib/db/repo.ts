import { db } from "./db";
import { newId } from "@/lib/id";
import type {
  AppSettings,
  DailyGoal,
  FoodItem,
  Habit,
  HabitLog,
  HabitStat,
  LogEntry,
  Macros100g,
  Meal,
  Profile,
  SystemFeed,
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
    imageUrl: params.food.imageUrl,
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
  version: number;
  exportedAt: number;
  profile?: Profile;
  foods: FoodItem[];
  logEntries: LogEntry[];
  weights: WeightEntry[];
  dailyGoals: DailyGoal[];
  water: WaterEntry[];
  settings: AppSettings[];
  habits?: Habit[];
  habitLog?: HabitLog[];
  system?: SystemFeed[];
}

/** Serialize all user data (except photos) to a JSON backup string. */
export async function exportData(): Promise<string> {
  const [
    profile,
    foods,
    logEntries,
    weights,
    dailyGoals,
    water,
    settings,
    habits,
    habitLog,
    systemFeeds,
  ] = await Promise.all([
    db.profile.get("me"),
    db.foods.toArray(),
    db.logEntries.toArray(),
    db.weights.toArray(),
    db.dailyGoals.toArray(),
    db.water.toArray(),
    db.settings.toArray(),
    db.habits.toArray(),
    db.habitLog.toArray(),
    db.system.toArray(),
  ]);
  const backup: Backup = {
    version: 4,
    exportedAt: Date.now(),
    profile,
    foods,
    logEntries,
    weights,
    dailyGoals,
    water,
    settings,
    habits,
    habitLog,
    system: systemFeeds,
  };
  return JSON.stringify(backup, null, 2);
}

/** Parse + validate a backup JSON string, throwing friendly errors. */
export function parseBackup(json: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("Это не JSON-файл — выбери корректный бэкап Calora.");
  }
  if (!raw || typeof raw !== "object") {
    throw new Error("Файл бэкапа пустой или повреждён.");
  }
  const b = raw as Partial<Backup>;
  if (typeof b.version !== "number") {
    throw new Error("Не похоже на бэкап Calora (нет версии файла).");
  }
  if (!Array.isArray(b.logEntries)) {
    throw new Error("В бэкапе нет записей питания — файл повреждён.");
  }
  for (const e of b.logEntries.slice(0, 50)) {
    const x = e as unknown as Record<string, unknown> | null;
    if (
      !x ||
      typeof x.id !== "string" ||
      typeof x.date !== "string" ||
      typeof x.kcal !== "number"
    ) {
      throw new Error("Формат записей не распознан — возможно, файл от другого приложения.");
    }
  }
  for (const key of ["foods", "weights", "dailyGoals", "water", "settings"] as const) {
    if (b[key] != null && !Array.isArray(b[key])) {
      throw new Error(`Раздел «${key}» в бэкапе повреждён.`);
    }
  }
  return b as Backup;
}

/** Replace all data with a validated backup. Throws on malformed input. */
export async function importData(json: string): Promise<void> {
  const b = parseBackup(json);
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
      db.habits,
      db.habitLog,
      db.system,
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
        db.habits.clear(),
        db.habitLog.clear(),
        db.system.clear(),
      ]);
      if (b.profile) await db.profile.put(b.profile);
      if (b.foods?.length) await db.foods.bulkPut(b.foods);
      if (b.logEntries?.length) await db.logEntries.bulkPut(b.logEntries);
      if (b.weights?.length) await db.weights.bulkPut(b.weights);
      if (b.dailyGoals?.length) await db.dailyGoals.bulkPut(b.dailyGoals);
      if (b.water?.length) await db.water.bulkPut(b.water);
      if (b.settings?.length) await db.settings.bulkPut(b.settings);
      if (b.habits?.length) await db.habits.bulkPut(b.habits);
      if (b.habitLog?.length) await db.habitLog.bulkPut(b.habitLog);
      if (b.system?.length) await db.system.bulkPut(b.system);
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
      db.habits,
      db.habitLog,
      db.system,
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
        db.habits.clear(),
        db.habitLog.clear(),
        db.system.clear(),
      ]);
    },
  );
}

// ── habits (custom daily quests) ──

const DEFAULT_HABITS: Omit<Habit, "id" | "createdAt">[] = [
  { name: "10 000 шагов", emoji: "🏃", stat: "STR", kind: "count", target: 10000, unit: "шаг", xp: 20, archived: false, order: 0 },
  { name: "2 часа чистого кодинга", emoji: "💻", stat: "INT", kind: "count", target: 2, unit: "ч", xp: 20, archived: false, order: 1 },
  { name: "Тренировка / зал", emoji: "🏋️", stat: "STR", kind: "bool", xp: 20, archived: false, order: 2 },
  { name: "0 PMO", emoji: "🧘", stat: "WIL", kind: "bool", xp: 20, archived: false, order: 3 },
  { name: "0 пива / срывов", emoji: "🚫", stat: "WIL", kind: "bool", xp: 20, archived: false, order: 4 },
];

/** Seed the default life-RPG habits once, if none exist. */
export async function ensureDefaultHabits(): Promise<void> {
  if ((await db.habits.count()) > 0) return;
  const now = Date.now();
  await db.habits.bulkAdd(
    DEFAULT_HABITS.map((h) => ({ ...h, id: newId(), createdAt: now })),
  );
}

export async function getActiveHabits(): Promise<Habit[]> {
  const all = await db.habits.orderBy("order").toArray();
  return all.filter((h) => !h.archived);
}

export async function addHabit(
  h: Omit<Habit, "id" | "createdAt" | "order" | "archived">,
): Promise<void> {
  const order = await db.habits.count();
  await db.habits.add({ ...h, id: newId(), order, archived: false, createdAt: Date.now() });
}

export async function archiveHabit(id: string): Promise<void> {
  await db.habits.update(id, { archived: true });
}

export async function getHabitLogsForDate(date: string): Promise<HabitLog[]> {
  return db.habitLog.where("date").equals(date).toArray();
}

export async function getAllHabitLogs(): Promise<HabitLog[]> {
  return db.habitLog.toArray();
}

export async function setHabitDone(
  habit: Habit,
  done: boolean,
  date = dayKey(),
): Promise<void> {
  await db.habitLog.put({
    id: `${date}__${habit.id}`,
    date,
    habitId: habit.id,
    value: done ? habit.target ?? 1 : 0,
    done,
  });
}

// ── AI "System" daily feed ──

export async function getSystemFeed(
  date = dayKey(),
): Promise<SystemFeed | undefined> {
  return db.system.get(date);
}

export async function getAllSystemFeeds(): Promise<SystemFeed[]> {
  return db.system.toArray();
}

export async function saveSystemFeed(feed: SystemFeed): Promise<void> {
  await db.system.put(feed);
}

/** Mark the day's AI bonus quest done/undone. */
export async function setBonusQuestDone(
  date: string,
  done: boolean,
): Promise<void> {
  const feed = await db.system.get(date);
  if (!feed) return;
  await db.system.put({ ...feed, bonusDone: done });
}

// ── settings & backup safety ──

const DEFAULT_SETTINGS: AppSettings = {
  id: "app",
  theme: "dark",
  units: "metric",
  aiVisionModel: "gpt-4o",
};

/** Merge-patch the app settings row (creates it if absent). */
export async function patchSettings(patch: Partial<AppSettings>): Promise<void> {
  const cur = (await db.settings.get("app")) ?? DEFAULT_SETTINGS;
  await db.settings.put({ ...cur, ...patch });
}

export const markBackupDone = () => patchSettings({ lastBackupAt: Date.now() });
export const snoozeBackupReminder = () =>
  patchSettings({ backupReminderSnoozedAt: Date.now() });

/** Ask the browser to keep IndexedDB persistent (less likely to be evicted). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    /* not supported */
  }
  return false;
}

/** How many days since the last backup (Infinity if never / no data yet). */
export function daysSinceBackup(settings: AppSettings | undefined): number {
  const last = settings?.lastBackupAt;
  if (!last) return Infinity;
  return (Date.now() - last) / 86_400_000;
}

/** Spend one ability point on a stat. */
export async function allocateStat(stat: HabitStat): Promise<void> {
  const s = (await db.settings.get("app")) ?? {
    id: "app" as const,
    theme: "dark" as const,
    units: "metric" as const,
    aiVisionModel: "gpt-4o",
  };
  const next: AppSettings = { ...s };
  if (stat === "STR") next.allocStr = (s.allocStr ?? 0) + 1;
  else if (stat === "INT") next.allocInt = (s.allocInt ?? 0) + 1;
  else next.allocWil = (s.allocWil ?? 0) + 1;
  await db.settings.put(next);
}
