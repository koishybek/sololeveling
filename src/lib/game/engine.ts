import type { DailyGoal, LogEntry, WeightEntry } from "@/lib/db/types";

export type StatKey = "STR" | "INT" | "WIL";
export type Rank = "E" | "D" | "C" | "B" | "A" | "S";

export interface Quest {
  key: string;
  label: string;
  done: boolean;
  xp: number;
  stat: StatKey;
}

export interface Stats {
  str: number;
  int: number;
  wil: number;
}

export interface Gate {
  rank: Rank;
  kg: number;
  reached: boolean;
}

export interface WeeklyChallenge {
  key: string;
  label: string;
  current: number;
  target: number;
  done: boolean;
}

export interface GameView {
  totalXp: number;
  level: number;
  rank: Rank;
  title: string;
  xpIntoLevel: number;
  xpForLevel: number;
  stats: Stats;
  todayQuests: Quest[];
  streak: number;
  penaltyActive: boolean;
  gates: Gate[];
  nextGate: Gate | null;
  currentWeight: number;
  weekly: WeeklyChallenge[];
}

export const XP_PER_QUEST = 20;
export const XP_PER_LEVEL = 100;

function sumMacros(entries: LogEntry[]) {
  return entries.reduce(
    (a, e) => ({
      kcal: a.kcal + e.kcal,
      proteinG: a.proteinG + e.proteinG,
      carbG: a.carbG + e.carbG,
      fatG: a.fatG + e.fatG,
    }),
    { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 },
  );
}

/** The five daily quests, derived purely from a day's entries + goal. */
export function dailyQuests(entries: LogEntry[], goal: DailyGoal): Quest[] {
  const meals = new Set(entries.map((e) => e.meal));
  const t = sumMacros(entries);
  return [
    {
      key: "meals",
      label: "Залогируй завтрак, обед и ужин",
      done: meals.has("breakfast") && meals.has("lunch") && meals.has("dinner"),
      xp: XP_PER_QUEST,
      stat: "WIL",
    },
    {
      key: "protein",
      label: "Добей дневную норму белка",
      done: goal.proteinG > 0 && t.proteinG >= goal.proteinG * 0.9,
      xp: XP_PER_QUEST,
      stat: "STR",
    },
    {
      key: "cap",
      label: "Уложись в норму калорий",
      done: entries.length > 0 && t.kcal <= goal.kcal,
      xp: XP_PER_QUEST,
      stat: "WIL",
    },
    {
      key: "correct",
      label: "Поправь оценку ИИ — обучи систему",
      done: entries.some((e) => e.correctionMade),
      xp: XP_PER_QUEST,
      stat: "INT",
    },
    {
      key: "whole",
      label: "Съешь цельный продукт",
      done: entries.some((e) => e.isWholeFood),
      xp: XP_PER_QUEST,
      stat: "INT",
    },
  ];
}

export function dayXp(quests: Quest[]): number {
  return quests.filter((q) => q.done).reduce((s, q) => s + q.xp, 0);
}

export function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function rankFromLevel(level: number): Rank {
  if (level >= 25) return "S";
  if (level >= 20) return "A";
  if (level >= 15) return "B";
  if (level >= 10) return "C";
  if (level >= 5) return "D";
  return "E";
}

const TITLES: Record<Rank, string> = {
  E: "Тот, кто выжил после 3-дневной курицы",
  D: "Охотник, поднявшийся с дивана",
  C: "Крепкий мидл Астаны",
  B: "Тот, на кого оборачиваются",
  A: "Хищник дисциплины",
  S: "Монарх Возвышения",
};

function groupByDate(entries: LogEntry[]): Map<string, LogEntry[]> {
  const m = new Map<string, LogEntry[]>();
  for (const e of entries) {
    const arr = m.get(e.date);
    if (arr) arr.push(e);
    else m.set(e.date, [e]);
  }
  return m;
}

function prevDate(key: string): string {
  const [y, mo, d] = key.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  dt.setDate(dt.getDate() - 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Weight gates (Solo-Leveling "врата") for a weight-loss journey. */
const GATE_DEFS: { rank: Rank; kg: number }[] = [
  { rank: "D", kg: 95 },
  { rank: "C", kg: 90 },
  { rank: "B", kg: 85 },
  { rank: "A", kg: 80 },
];

export function computeGame(params: {
  entries: LogEntry[];
  goal: DailyGoal;
  weights: WeightEntry[];
  today: string;
  startWeightKg: number;
}): GameView {
  const { entries, goal, weights, today, startWeightKg } = params;
  const byDate = groupByDate(entries);

  let totalXp = 0;
  const stats: Stats = { str: 0, int: 0, wil: 0 };
  for (const [, es] of byDate) {
    for (const q of dailyQuests(es, goal)) {
      if (!q.done) continue;
      totalXp += q.xp;
      if (q.stat === "STR") stats.str++;
      else if (q.stat === "INT") stats.int++;
      else stats.wil++;
    }
  }

  const level = levelFromXp(totalXp);
  const rank = rankFromLevel(level);
  const xpIntoLevel = totalXp - (level - 1) * XP_PER_LEVEL;
  const todayQuests = dailyQuests(byDate.get(today) ?? [], goal);

  // streak: consecutive days (ending today/yesterday) with any quest done
  let streak = 0;
  let cursor = dayXp(todayQuests) > 0 ? today : prevDate(today);
  while (true) {
    const es = byDate.get(cursor);
    if (es && dayXp(dailyQuests(es, goal)) > 0) {
      streak++;
      cursor = prevDate(cursor);
    } else break;
  }

  // penalty: there is prior history but nothing logged today yet
  const penaltyActive =
    (byDate.get(today)?.length ?? 0) === 0 && byDate.size > 0;

  const currentWeight = weights.length
    ? weights[weights.length - 1].weightKg
    : startWeightKg;
  const gates: Gate[] = GATE_DEFS.map((g) => ({
    ...g,
    reached: currentWeight <= g.kg,
  }));
  const nextGate = gates.find((g) => !g.reached) ?? null;

  // weekly challenges over the last 7 days (ending today)
  let loggedDays = 0;
  let capDays = 0;
  let proteinDays = 0;
  let weekCursor = today;
  for (let i = 0; i < 7; i++) {
    const es = byDate.get(weekCursor);
    if (es && es.length) {
      loggedDays++;
      const qs = dailyQuests(es, goal);
      if (qs.find((q) => q.key === "cap")?.done) capDays++;
      if (qs.find((q) => q.key === "protein")?.done) proteinDays++;
    }
    weekCursor = prevDate(weekCursor);
  }
  const weekly: WeeklyChallenge[] = [
    { key: "logged7", label: "Логируй каждый день", current: loggedDays, target: 7, done: loggedDays >= 7 },
    { key: "cap5", label: "5 дней в норме калорий", current: capDays, target: 5, done: capDays >= 5 },
    { key: "protein5", label: "5 дней добить белок", current: proteinDays, target: 5, done: proteinDays >= 5 },
  ];

  return {
    totalXp,
    level,
    rank,
    title: TITLES[rank],
    xpIntoLevel,
    xpForLevel: XP_PER_LEVEL,
    stats,
    todayQuests,
    streak,
    penaltyActive,
    gates,
    nextGate,
    currentWeight,
    weekly,
  };
}
