import type { DailyGoal, LogEntry } from "@/lib/db/types";

export interface DayPoint {
  date: string;
  label: string; // DD.MM
  kcal: number;
  goal: number;
  logged: boolean;
}

export type DayState = "none" | "under" | "over";

export interface AnalyticsView {
  series: DayPoint[];
  avgKcal: number;
  avgProtein: number;
  daysLogged: number;
  adherencePct: number;
  /** Consecutive days (ending today/yesterday) with any logged food. */
  streak: number;
  calendar: { date: string; state: DayState }[];
}

function prevDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** Streak of consecutive logged days, engine-independent (plain habit metric). */
export function loggedStreak(
  byDate: Map<string, unknown[]>,
  today: string,
): number {
  let streak = 0;
  let cursor = (byDate.get(today)?.length ?? 0) > 0 ? today : prevDate(today);
  while ((byDate.get(cursor)?.length ?? 0) > 0) {
    streak++;
    cursor = prevDate(cursor);
  }
  return streak;
}

function lastDates(today: string, n: number): string[] {
  const [y, m, d] = today.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(base);
    dt.setDate(dt.getDate() - i);
    out.push(
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
        dt.getDate(),
      ).padStart(2, "0")}`,
    );
  }
  return out;
}

/** Aggregate logged days into chart series, averages and a consistency calendar. */
export function buildAnalytics(params: {
  entries: LogEntry[];
  goal: DailyGoal;
  today: string;
  days?: number;
  calDays?: number;
}): AnalyticsView {
  const { entries, goal, today, days = 14, calDays = 35 } = params;

  const byDate = new Map<string, LogEntry[]>();
  for (const e of entries) {
    const a = byDate.get(e.date);
    if (a) a.push(e);
    else byDate.set(e.date, [e]);
  }

  const sum = (es: LogEntry[]) =>
    es.reduce((a, e) => ({ k: a.k + e.kcal, p: a.p + e.proteinG }), { k: 0, p: 0 });

  const series: DayPoint[] = lastDates(today, days).map((date) => {
    const es = byDate.get(date) ?? [];
    const s = sum(es);
    return {
      date,
      label: date.slice(5).replace("-", "."),
      kcal: s.k,
      goal: goal.kcal,
      logged: es.length > 0,
    };
  });

  const logged = series.filter((p) => p.logged);
  const daysLogged = logged.length;
  const avgKcal = daysLogged
    ? Math.round(logged.reduce((a, p) => a + p.kcal, 0) / daysLogged)
    : 0;
  const avgProtein = daysLogged
    ? Math.round(
        lastDates(today, days).reduce((a, date) => {
          const es = byDate.get(date);
          return a + (es ? sum(es).p : 0);
        }, 0) / daysLogged,
      )
    : 0;
  const underDays = logged.filter((p) => p.kcal <= p.goal).length;
  const adherencePct = daysLogged ? Math.round((underDays / daysLogged) * 100) : 0;

  const calendar = lastDates(today, calDays).map((date) => {
    const es = byDate.get(date);
    let state: DayState = "none";
    if (es && es.length) state = sum(es).k <= goal.kcal ? "under" : "over";
    return { date, state };
  });

  const streak = loggedStreak(byDate, today);

  return { series, avgKcal, avgProtein, daysLogged, adherencePct, streak, calendar };
}

export interface WeeklySummary {
  /** Days with any logged food in the last 7. */
  loggedDays: number;
  /** Days at/under the calorie goal. */
  deficitDays: number;
  /** Most frequently logged food + its count. */
  topFood: { name: string; count: number } | null;
  avgKcal: number;
  avgProtein: number;
  /** Signed average deviation from the calorie goal (negative = under). */
  kcalDeltaAvg: number;
}

/** Product-analytics roundup over the last 7 days ("Итоги недели"). */
export function buildWeekly(params: {
  entries: LogEntry[];
  goal: DailyGoal;
  today: string;
}): WeeklySummary {
  const { entries, goal, today } = params;
  const window = new Set(lastDates(today, 7));
  const byDate = new Map<string, LogEntry[]>();
  const foodCount = new Map<string, number>();

  for (const e of entries) {
    if (!window.has(e.date)) continue;
    const arr = byDate.get(e.date);
    if (arr) arr.push(e);
    else byDate.set(e.date, [e]);
    foodCount.set(e.foodName, (foodCount.get(e.foodName) ?? 0) + 1);
  }

  const days = [...byDate.values()];
  const loggedDays = days.length;
  let deficitDays = 0;
  let kcalSum = 0;
  let proteinSum = 0;
  for (const es of days) {
    const k = es.reduce((s, e) => s + e.kcal, 0);
    proteinSum += es.reduce((s, e) => s + e.proteinG, 0);
    kcalSum += k;
    if (k <= goal.kcal) deficitDays++;
  }

  const avgKcal = loggedDays ? Math.round(kcalSum / loggedDays) : 0;
  const avgProtein = loggedDays ? Math.round(proteinSum / loggedDays) : 0;
  const kcalDeltaAvg = loggedDays ? Math.round(avgKcal - goal.kcal) : 0;

  let topFood: { name: string; count: number } | null = null;
  for (const [name, count] of foodCount) {
    if (!topFood || count > topFood.count) topFood = { name, count };
  }

  return { loggedDays, deficitDays, topFood, avgKcal, avgProtein, kcalDeltaAvg };
}
