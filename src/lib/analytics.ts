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
  calendar: { date: string; state: DayState }[];
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

  return { series, avgKcal, avgProtein, daysLogged, adherencePct, calendar };
}
