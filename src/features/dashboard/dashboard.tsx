"use client";

import { useMemo, useState } from "react";
import { Button, Card, MacroBar, ProgressRing } from "@/components/ui";
import { addWater, dayKey, deleteLogEntry } from "@/lib/db/repo";
import type { LogEntry, Meal, Profile } from "@/lib/db/types";
import { goalFromProfile } from "@/lib/plan";
import { useGameView, useToday } from "@/lib/hooks";
import { SettingsSheet } from "@/features/settings/settings-sheet";
import { EditEntrySheet } from "./edit-entry-sheet";

const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Завтрак",
  lunch: "Обед",
  dinner: "Ужин",
  snack: "Перекус",
};

export function Dashboard({ profile }: { profile: Profile }) {
  const [dayOffset, setDayOffset] = useState(0);
  const viewDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    return dayKey(d);
  }, [dayOffset]);
  const today = useToday(viewDate);
  const game = useGameView(profile);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDayOffset((o) => o + 1)}
            aria-label="Предыдущий день"
            className="rounded-lg px-2 py-1 text-lg text-muted transition hover:bg-surface"
          >
            ‹
          </button>
          <div className="min-w-[7rem] text-center">
            <h1 className="text-lg font-semibold capitalize">{dateLabel}</h1>
            <p className="text-xs text-accent">
              {game ? `${game.rank}-ранг · ур. ${game.level}` : "E-ранг"}
            </p>
          </div>
          <button
            onClick={() => setDayOffset((o) => Math.max(0, o - 1))}
            disabled={dayOffset === 0}
            aria-label="Следующий день"
            className="rounded-lg px-2 py-1 text-lg text-muted transition hover:bg-surface disabled:opacity-30"
          >
            ›
          </button>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Настройки"
          className="rounded-lg p-2 text-xl text-muted transition hover:bg-surface"
        >
          ⚙
        </button>
      </header>

      <Card className="flex flex-col items-center gap-5 py-6">
        <ProgressRing
          value={totals.kcal}
          max={goal.kcal}
          color={over ? "var(--color-danger)" : "var(--color-accent)"}
        >
          <div className="text-center">
            <div
              className={`text-4xl font-bold tabular-nums ${over ? "text-danger" : ""}`}
            >
              {Math.abs(remaining)}
            </div>
            <div className="text-xs text-muted">
              {over ? "перебор, ккал" : "осталось, ккал"}
            </div>
          </div>
        </ProgressRing>

        <div className="text-xs text-muted">
          {totals.kcal} / {goal.kcal} ккал
        </div>

        <div className="flex w-full gap-4">
          <MacroBar
            label="Белки"
            value={totals.proteinG}
            goal={goal.proteinG}
            color="var(--color-protein)"
          />
          <MacroBar
            label="Углеводы"
            value={totals.carbG}
            goal={goal.carbG}
            color="var(--color-carb)"
          />
          <MacroBar
            label="Жиры"
            value={totals.fatG}
            goal={goal.fatG}
            color="var(--color-fat)"
          />
        </div>
      </Card>

      <Card className="mt-4 flex items-center justify-between p-4">
        <div>
          <div className="text-sm font-medium">Вода</div>
          <div className="text-xs text-muted tabular-nums">
            {today?.water ?? 0} мл
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void addWater(250, today?.date)}>
            +250
          </Button>
          <Button variant="outline" onClick={() => void addWater(500, today?.date)}>
            +500
          </Button>
        </div>
      </Card>

      {/* meals */}
      <div className="mt-4 space-y-3">
        {(Object.keys(byMeal) as Meal[]).map((meal) =>
          byMeal[meal].length ? (
            <Card key={meal} className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">{MEAL_LABELS[meal]}</span>
                <span className="text-xs text-muted">
                  {byMeal[meal].reduce((s, e) => s + e.kcal, 0)} ккал
                </span>
              </div>
              <ul className="space-y-1.5">
                {byMeal[meal].map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <button
                      onClick={() => setEditing(e)}
                      className="flex-1 truncate text-left"
                    >
                      {e.foodName}
                      <span className="text-muted"> · {e.grams} г</span>
                    </button>
                    <span className="flex items-center gap-2 tabular-nums">
                      {e.kcal}
                      <button
                        onClick={() => void deleteLogEntry(e.id)}
                        aria-label="Удалить"
                        className="text-muted hover:text-danger"
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null,
        )}

        {!hasEntries && (
          <Card className="py-8 text-center text-sm text-muted">
            Пока ничего не залогировано.
            <br />
            Нажми <span className="text-accent">+</span>, чтобы добавить еду
            фото, голосом или штрихкодом.
          </Card>
        )}
      </div>

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={profile}
      />
      <EditEntrySheet entry={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
