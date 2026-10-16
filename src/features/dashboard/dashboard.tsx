"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { FoodThumb } from "@/components/food-thumb";
import { BackupReminder } from "@/components/backup-reminder";
import { addWater, dayKey, deleteLogEntry } from "@/lib/db/repo";
import type { DailyGoal, LogEntry, Meal, Profile } from "@/lib/db/types";
import { goalFromProfile } from "@/lib/plan";
import { useToday } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { AddTarget } from "@/features/add-entry/add-entry-sheet";
import { EditEntrySheet } from "./edit-entry-sheet";

/** Meal cards with their share of the daily goal (min..max). */
const MEALS: { key: Meal; label: string; emoji: string; share: [number, number] }[] = [
  { key: "breakfast", label: "Завтрак", emoji: "🥐", share: [0.25, 0.35] },
  { key: "lunch", label: "Обед", emoji: "🥗", share: [0.3, 0.4] },
  { key: "dinner", label: "Ужин", emoji: "🍝", share: [0.25, 0.35] },
  { key: "snack", label: "Перекус", emoji: "🍌", share: [0.05, 0.15] },
];

export function Dashboard({
  profile,
  onAdd,
}: {
  profile: Profile;
  onAdd: (t: AddTarget) => void;
}) {
  const [dayOffset, setDayOffset] = useState(0);
  const viewDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    return dayKey(d);
  }, [dayOffset]);
  const today = useToday(viewDate);
  const [editing, setEditing] = useState<LogEntry | null>(null);

  const dateText = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" })
    .format(new Date(`${viewDate}T00:00:00`))
    .replace(".", "");
  const dateLabel =
    dayOffset === 0 ? `Сегодня, ${dateText}` : dayOffset === 1 ? `Вчера, ${dateText}` : dateText;
  const goal = today?.goal ?? goalFromProfile(profile);
  const totals = today?.totals ?? { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 };

  const byMeal = useMemo(() => {
    const map: Record<Meal, LogEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    for (const e of today?.entries ?? []) map[e.meal].push(e);
    return map;
  }, [today]);

  return (
    <div>
      {/* green hero */}
      <section className="relative overflow-hidden px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#46d95f_0%,#2fa346_38%,rgba(20,20,22,0)_100%)]" />

        <header className="relative mb-2 flex items-center justify-between">
          <button
            onClick={() => setDayOffset((o) => o + 1)}
            aria-label="Предыдущий день"
            className="grid size-9 place-items-center rounded-full text-on-accent/80 transition active:scale-90"
          >
            <Icon name="chevron-left" size={22} strokeWidth={2.4} />
          </button>
          <button
            onClick={() => setDayOffset(0)}
            className="flex items-center gap-1.5 text-[14px] font-bold uppercase tracking-[1.2px] text-on-accent"
          >
            <Icon name="clock" size={16} strokeWidth={2.2} />
            {dateLabel}
          </button>
          <button
            onClick={() => setDayOffset((o) => Math.max(0, o - 1))}
            disabled={dayOffset === 0}
            aria-label="Следующий день"
            className="grid size-9 place-items-center rounded-full text-on-accent/80 transition active:scale-90 disabled:opacity-30"
          >
            <Icon name="chevron-right" size={22} strokeWidth={2.4} />
          </button>
        </header>

        <CalorieArc eaten={totals.kcal} goal={goal.kcal} />
      </section>

      <div className="px-4">
        {/* macro cards */}
        <div className="-mt-2 grid grid-cols-3 gap-2.5">
          <MacroCard label="Углеводы" value={totals.carbG} goal={goal.carbG} color="var(--color-carb)" />
          <MacroCard label="Белки" value={totals.proteinG} goal={goal.proteinG} color="var(--color-protein)" />
          <MacroCard label="Жиры" value={totals.fatG} goal={goal.fatG} color="var(--color-fat)" />
        </div>

        <div className="mt-4">
          <BackupReminder />
        </div>

        <SectionTitle>Дневник питания</SectionTitle>
        <div className="space-y-3">
          {MEALS.map((m) => (
            <MealCard
              key={m.key}
              label={m.label}
              emoji={m.emoji}
              range={mealRange(goal, m.share)}
              entries={byMeal[m.key]}
              onAdd={() => onAdd({ meal: m.key, date: viewDate })}
              onEdit={setEditing}
              onDelete={(id) => void deleteLogEntry(id)}
            />
          ))}
        </div>

        <div className="mt-3" />
        <WaterCard ml={today?.water ?? 0} date={viewDate} />
      </div>

      <EditEntrySheet entry={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function mealRange(goal: DailyGoal, [lo, hi]: [number, number]): string {
  return `${Math.round(goal.kcal * lo)}–${Math.round(goal.kcal * hi)} ккал`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-6 text-[13px] font-semibold uppercase tracking-[1.5px] text-muted">
      {children}
    </h2>
  );
}

/** 270° arc gauge: "Осталось" in the middle, eaten / goal on the sides. */
function CalorieArc({ eaten, goal }: { eaten: number; goal: number }) {
  const size = 210;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const pct = goal > 0 ? Math.min(Math.max(eaten / goal, 0), 1) : 0;
  const remaining = goal - eaten;
  const over = remaining < 0;

  return (
    <div className="relative flex items-center justify-between">
      <SideStat label="Потреблено" value={eaten} />
      <div className="relative" style={{ width: size, height: size * 0.86 }}>
        <svg width={size} height={size} className="rotate-[135deg]">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circ}`}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={over ? "var(--color-danger)" : "#ffffff"}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arc * pct} ${circ}`}
            style={{ transition: "stroke-dasharray .9s cubic-bezier(.4,0,.2,1)" }}
          />
        </svg>
        <div className="absolute inset-x-0 top-[26%] flex flex-col items-center text-on-accent">
          <div className="text-[15px] font-medium">{over ? "Перебор" : "Осталось"}</div>
          <div className="mt-1 text-[52px] font-semibold leading-none tabular-nums tracking-tight">
            {Math.abs(remaining)}
          </div>
          <div className="mt-2 text-[13px] font-medium tabular-nums opacity-75">
            Цель {goal} ккал
          </div>
        </div>
      </div>
      <SideStat label="Цель" value={goal} />
    </div>
  );
}

function SideStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="w-[76px] text-center text-on-accent">
      <div className="text-[13px] font-medium opacity-80">{label}</div>
      <div className="mt-1 text-[24px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function MacroCard({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  const pct = goal > 0 ? Math.min(value / goal, 1) * 100 : 0;
  return (
    <div className="rounded-[14px] bg-surface p-3 shadow-card">
      <div className="text-[13px] font-semibold">{label}</div>
      <div className="mt-0.5 text-[13px] tabular-nums text-muted">
        <span className="text-fg">{Math.round(value)}</span>/{Math.round(goal)}г
      </div>
      <div
        className="mt-2 h-[6px] overflow-hidden rounded-full"
        style={{ background: `color-mix(in srgb, ${color} 28%, transparent)` }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function MealCard({
  label,
  emoji,
  range,
  entries,
  onAdd,
  onEdit,
  onDelete,
}: {
  label: string;
  emoji: string;
  range: string;
  entries: LogEntry[];
  onAdd: () => void;
  onEdit: (e: LogEntry) => void;
  onDelete: (id: string) => void;
}) {
  const kcal = entries.reduce((s, e) => s + e.kcal, 0);
  return (
    <Card className="p-0">
      <div className="flex items-center gap-4 p-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-full bg-surface-2 text-[30px] leading-none">
          {emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[18px] font-semibold">{label}</div>
          <div className="mt-0.5 text-[13px] text-muted">
            {entries.length ? (
              <>
                <span className="font-semibold text-fg">{kcal} ккал</span> из {range}
              </>
            ) : (
              <>Рекомендуется: {range}</>
            )}
          </div>
        </div>
        <RoundAdd label={`Добавить: ${label}`} onClick={onAdd} />
      </div>

      {entries.length > 0 && (
        <ul className="border-t border-border px-4">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 border-t border-border py-3 first:border-t-0">
              <FoodThumb imageUrl={e.imageUrl} name={e.foodName} size={40} className="rounded-full" />
              <button onClick={() => onEdit(e)} className="min-w-0 flex-1 text-left">
                <div className="truncate text-[15px] font-medium">{e.foodName}</div>
                <div className="text-[12px] text-muted">
                  {e.kcal} ккал · {e.grams} г
                </div>
              </button>
              <button
                onClick={() => onDelete(e.id)}
                aria-label={`Удалить ${e.foodName}`}
                className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:text-danger"
              >
                <Icon name="close" size={14} strokeWidth={2.4} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function RoundAdd({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-muted transition active:scale-90",
        className,
      )}
    >
      <Icon name="plus" size={22} strokeWidth={2} />
    </button>
  );
}

const WATER_GOAL_ML = 2500;
const GLASS_ML = 250;

function WaterCard({ ml, date }: { ml: number; date: string }) {
  const glasses = Math.ceil(WATER_GOAL_ML / GLASS_ML);
  const full = Math.floor(ml / GLASS_ML);
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="text-[18px] font-semibold">💧 Вода</div>
        <div className="text-[13px] tabular-nums text-muted">
          <span className="font-semibold text-fg">{(ml / 1000).toLocaleString("ru-RU")}</span> /{" "}
          {(WATER_GOAL_ML / 1000).toLocaleString("ru-RU")} л
        </div>
      </div>
      <div className="flex justify-between gap-1">
        {Array.from({ length: glasses }, (_, i) => (
          <button
            key={i}
            onClick={() => void addWater(i < full ? -GLASS_ML : GLASS_ML, date)}
            aria-label={i < full ? "Убрать стакан" : "Добавить стакан"}
            className={cn(
              "grid h-10 flex-1 place-items-center rounded-[10px] text-[18px] transition active:scale-90",
              i < full ? "bg-carb/25" : "bg-surface-2 opacity-60",
            )}
          >
            {i < full ? "🥤" : i === full ? "＋" : ""}
          </button>
        ))}
      </div>
    </Card>
  );
}
