"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db/db";
import { dayKey, getEntriesForDate, sumEntries, type DayTotals } from "./db/repo";
import type { DailyGoal, FoodItem, LogEntry, Profile, WeightEntry } from "./db/types";
import { computeGame, type GameView } from "./game/engine";
import { goalFromProfile } from "./plan";

export function useProfileState(): { loading: boolean; profile: Profile | null } {
  const result = useLiveQuery(async () => ({
    profile: (await db.profile.get("me")) ?? null,
  }));
  if (result === undefined) return { loading: true, profile: null };
  return { loading: false, profile: result.profile };
}

export interface TodaySnapshot {
  date: string;
  entries: LogEntry[];
  totals: DayTotals;
  goal: DailyGoal | null;
  water: number;
}

export function useToday(date: string = dayKey()): TodaySnapshot | undefined {
  return useLiveQuery(async () => {
    const entries = await getEntriesForDate(date);
    const goal = (await db.dailyGoals.get(date)) ?? null;
    const water = (await db.water.get(date))?.ml ?? 0;
    return { date, entries, totals: sumEntries(entries), goal, water };
  }, [date]);
}

export function useWeights(): WeightEntry[] | undefined {
  return useLiveQuery(() => db.weights.orderBy("date").toArray());
}

export function useGameView(profile: Profile): GameView | undefined {
  const data = useLiveQuery(async () => {
    const entries = await db.logEntries.toArray();
    const weights = await db.weights.orderBy("date").toArray();
    const todayGoal = (await db.dailyGoals.get(dayKey())) ?? null;
    return { entries, weights, todayGoal };
  });
  if (!data) return undefined;
  const goal = data.todayGoal ?? goalFromProfile(profile);
  const startWeightKg = data.weights[0]?.weightKg ?? profile.weightKg;
  return computeGame({
    entries: data.entries,
    goal,
    weights: data.weights,
    today: dayKey(),
    startWeightKg,
  });
}

export function useRecentFoods(limit = 10): FoodItem[] | undefined {
  return useLiveQuery(async () => {
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
  });
}
