"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db/db";
import {
  dayKey,
  getEntriesForDate,
  sumEntries,
  type DayTotals,
} from "./db/repo";
import type {
  DailyGoal,
  FoodItem,
  LogEntry,
  Profile,
  WeightEntry,
} from "./db/types";

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

export function useRecentFoods(limit = 10): FoodItem[] | undefined {
  return useLiveQuery(async () => {
    const recent = await db.logEntries
      .orderBy("createdAt")
      .reverse()
      .limit(60)
      .toArray();
    // Dedupe by name: older data has one food row per log of the same product.
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const e of recent) {
      const k = e.foodName.trim().toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        ids.push(e.foodId);
      }
      if (ids.length >= limit) break;
    }
    const foods = await db.foods.bulkGet(ids);
    return foods.filter((f): f is FoodItem => Boolean(f));
  });
}

export function useFavorites(limit = 24): FoodItem[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.foods.toArray();
    return all.filter((f) => f.favorite).slice(0, limit);
  });
}
