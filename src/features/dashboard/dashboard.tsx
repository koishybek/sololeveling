"use client";

import { useMemo, useState } from "react";
import { Button, Card, MacroRow, ProgressRing } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { addWater, dayKey, deleteLogEntry } from "@/lib/db/repo";
import type { LogEntry, Meal, Profile } from "@/lib/db/types";
import { goalFromProfile } from "@/lib/plan";
import { useToday } from "@/lib/hooks";
import { EditEntrySheet } from "./edit-entry-sheet";

const MEALS: { key: Meal; label: string; icon: IconName }[] = [
  { key: "breakfast", label: "Завтрак", icon: "sunrise" },
  { key: "lunch", label: "Обед", icon: "sun" },
  { key: "dinner", label: "Ужин", icon: "moon" },
  { key: "snack", label: "Перекус", icon: "leaf" },
];

export function Dashboard({ profile }: { profile: Profile }) {
  const [dayOffset, setDayOffset] = useState(0);
  const viewDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    return dayKey(d);
  }, [dayOffset]);
  const today = useToday(viewDate);
  const [editing, setEditing] = useState<LogEntry | null>(null);

  const dateLabel =
    dayOffset === 0
      ? "Сегодня"
      : new Intl.DateTimeFormat("ru-RU", {
          day: "numeric",
          month: "long",
          weekday: "short",
        }).format(new Date(`${viewDate}T00:00:00`));
  const goal = today?.goal ?? goalFromProfile(profile);
  const totals = today?.totals ?? { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 };
  const remaining = goal.kcal - totals.kcal;
  const over = remaining < 0;

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

  const hasEntries = (today?.entries.length ?? 0) > 0;

  return (
    <div className="px-4 pt-6">
      {/* header: date nav */}
      <header className="mb-5 flex items-center justify-between">
        <div className="flex flex-1 items-center justify-center gap-3">
          <button
            onClick={() => setDayOffset((o) => o + 1)}
            aria-label="Предыдущий день"
            className="grid size-8 place-items-center rounded-full text-muted transition active:scale-90"
          >
            <Icon name="chevron-left" size={20} strokeWidth={2.2} />
          </button>
          <h1 className="min-w-[6rem] text-center text-lg font-bold capitalize">
            {dateLabel}
          </h1>
          <button
            onClick={() => setDayOffset((o) => Math.max(0, o - 1))}
            disabled={dayOffset === 0}
            aria-label="Следующий день"
            className="grid size-8 place-items-center rounded-full text-muted transition active:scale-90 disabled:opacity-30"
          >
            <Icon name="chevron-right" size={20} strokeWidth={2.2} />
          </button>
        </div>
      </header>

      {/* calorie ring */}
      <div className="flex flex-col items-center">
        <ProgressRing value={totals.kcal} max={goal.kcal} size={210} stroke={13}
          color={over ? "var(--color-danger)" : "var(--color-accent)"}>
          <div className="flex flex-col items-center">
            <div
              className={`text-[52px] font-extrabold leading-none tabular-nums tracking-tight ${over ? "text-danger" : ""}`}
            >
              {Math.abs(remaining)}
            </div>
            <div className="mt-1 text-[13px] text-muted">
              {over ? "ккал перебор" : "ккал осталось"}
            </div>
            <div className="mt-0.5 text-[13px] tabular-nums text-muted">
              {totals.kcal} / {goal.kcal}
            </div>
          </div>
        </ProgressRing>
      </div>

      {/* macros */}
      <div className="mt-6 flex flex-col gap-4">
        <MacroRow iconName="protein" label="Белки" value={totals.proteinG} goal={goal.proteinG} color="var(--color-protein)" />
        <MacroRow iconName="wheat" label="Углеводы" value={totals.carbG} goal={goal.carbG} color="var(--color-carb)" />
        <MacroRow iconName="drop" label="Жиры" value={totals.fatG} goal={goal.fatG} color="var(--color-fat)" />
      </div>

      {/* water */}
      <WaterCard ml={today?.water ?? 0} date={today?.date} />

      {/* meals */}
      <div className="mt-4 space-y-3">
        {MEALS.map(({ key, label, icon }) =>
          byMeal[key].length ? (
            <MealCard
              key={key}
              label={label}
              icon={icon}
              entries={byMeal[key]}
              onEdit={setEditing}
              onDelete={(id) => void deleteLogEntry(id)}
            />
          ) : null,
        )}

        {!hasEntries && (
          <Card className="py-10 text-center text-[15px] text-muted">
            Пока ничего не залогировано.
            <br />
            Нажми <span className="font-semibold text-accent">＋</span>, чтобы
            добавить еду.
          </Card>
        )}
      </div>

      <EditEntrySheet entry={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function WaterCard({ ml, date }: { ml: number; date?: string }) {
  return (
    <Card className="relative mt-4 overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-full text-fat ring-1 ring-fat/30">
            <Icon name="drop" size={20} filled />
          </div>
          <div>
            <div className="text-[13px] text-muted">Вода</div>
            <div className="text-lg font-bold tabular-nums">
              {ml.toLocaleString("ru-RU")} <span className="text-[13px] font-normal text-muted">мл</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="px-4 py-2 text-[13px]" onClick={() => void addWater(250, date)}>
            +250
          </Button>
          <Button variant="secondary" className="px-4 py-2 text-[13px]" onClick={() => void addWater(500, date)}>
            +500
          </Button>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 bg-fat/10" />
    </Card>
  );
}

function MealCard({
  label,
  icon,
  entries,
  onEdit,
  onDelete,
}: {
  label: string;
  icon: IconName;
  entries: LogEntry[];
  onEdit: (e: LogEntry) => void;
  onDelete: (id: string) => void;
}) {
  const kcal = entries.reduce((s, e) => s + e.kcal, 0);
  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center gap-2.5">
        <div className="grid size-8 place-items-center rounded-full bg-accent text-white">
          <Icon name={icon} size={16} />
        </div>
        <span className="flex-1 text-[17px] font-bold">{label}</span>
        <span className="text-[13px] tabular-nums text-muted">{kcal} ккал</span>
      </div>
      <ul>
        {entries.map((e) => (
          <li
            key={e.id}
            className="flex items-center gap-3 border-t border-border py-3 first:border-t-0"
          >
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
              <Icon name="leaf" size={18} />
            </div>
            <button onClick={() => onEdit(e)} className="min-w-0 flex-1 text-left">
              <div className="truncate text-[14px] font-semibold">{e.foodName}</div>
              <div className="text-[12px] text-muted">{e.grams} г</div>
            </button>
            <span className="text-[14px] font-bold tabular-nums">
              {e.kcal} <span className="text-[12px] font-normal text-muted">ккал</span>
            </span>
            <button
              onClick={() => onDelete(e.id)}
              aria-label="Удалить"
              className="grid size-7 shrink-0 place-items-center rounded-full text-muted transition hover:text-danger"
            >
              <Icon name="close" size={13} strokeWidth={2.4} />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
