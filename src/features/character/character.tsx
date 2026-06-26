"use client";

import type { Profile } from "@/lib/db/types";
import type { GameView, Quest, StatKey } from "@/lib/game/engine";
import { useGameView } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const STAT_META: Record<StatKey, { label: string; color: string; desc: string }> = {
  STR: { label: "СИЛА", color: "var(--color-protein)", desc: "белок и тело" },
  INT: { label: "ИНТЕЛЛЕКТ", color: "var(--color-accent)", desc: "точность и знания" },
  WIL: { label: "ВОЛЯ", color: "var(--color-fat)", desc: "дисциплина и стрик" },
};

export function Character({ profile }: { profile: Profile }) {
  const game = useGameView(profile);

  if (!game) {
    return <div className="px-4 pt-8 text-center text-muted">Загрузка статуса…</div>;
  }

  return (
    <div className="space-y-4 px-4 pt-6">
      <StatusWindow game={game} />
      {game.penaltyActive ? (
        <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger [animation:pulseGlow_1.6s_ease-in-out_infinite]">
          ⚠ ТАЙМ-АУТ. Сегодня дейлик не тронут. Выполни хотя бы одно задание —
          иначе серия сгорит.
        </div>
      ) : game.streak > 0 ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          🔥 Серия: <span className="font-semibold text-fat">{game.streak}</span>{" "}
          {game.streak === 1 ? "день" : "дн."} подряд
        </div>
      ) : null}

      <QuestsPanel quests={game.todayQuests} />
      <WeeklyPanel weekly={game.weekly} />
      <GatesPanel game={game} />
    </div>
  );
}

function StatusWindow({ game }: { game: GameView }) {
  return (
    <section className="rounded-2xl border border-accent/40 bg-surface/80 p-5 shadow-[0_0_30px_-10px_var(--color-accent)]">
      <div className="mb-4 text-center text-xs tracking-[0.3em] text-accent/80">
        ⟦ СТАТУС ⟧
      </div>

      <div className="flex items-center gap-4">
        <div className="relative grid size-20 shrink-0 place-items-center rounded-2xl bg-accent/10 ring-1 ring-accent/50">
          <span className="text-4xl font-bold text-accent">{game.rank}</span>
          <span className="absolute -bottom-2 rounded-full bg-base px-2 text-[11px] text-muted ring-1 ring-border">
            ур. {game.level}
          </span>
        </div>
        <div className="min-w-0">
          <div className="text-lg font-semibold">Олжас</div>
          <div className="text-xs text-muted">ИИ-Архитектор · Атлет</div>
          <div className="mt-1 text-xs italic text-accent/90">«{game.title}»</div>
        </div>
      </div>

      {/* XP bar */}
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[11px] text-muted">
          <span>EXP</span>
          <span className="tabular-nums">
            {game.xpIntoLevel} / {game.xpForLevel}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${(game.xpIntoLevel / game.xpForLevel) * 100}%` }}
          />
        </div>
      </div>

      {/* stats */}
      <div className="mt-5 space-y-3">
        {(Object.keys(STAT_META) as StatKey[]).map((k) => {
          const meta = STAT_META[k];
          const value =
            k === "STR" ? game.stats.str : k === "INT" ? game.stats.int : game.stats.wil;
          const pct = (value / (value + 8)) * 100;
          return (
            <div key={k}>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className="tracking-wider" style={{ color: meta.color }}>
                  {meta.label}
                </span>
                <span className="tabular-nums font-semibold">{value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${pct}%`, background: meta.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function QuestsPanel({ quests }: { quests: Quest[] }) {
  const doneCount = quests.filter((q) => q.done).length;
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-1 text-xs tracking-[0.2em] text-accent/80">
        ⟦ ЕЖЕДНЕВНОЕ ЗАДАНИЕ ⟧
      </div>
      <div className="mb-3 text-sm font-medium">
        Очищение Разума и Тела
        <span className="ml-2 text-xs text-muted">
          {doneCount}/{quests.length}
        </span>
      </div>
      <ul className="space-y-2">
        {quests.map((q) => (
          <li key={q.key} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full text-xs",
                q.done
                  ? "bg-accent text-base"
                  : "border border-border text-transparent",
              )}
            >
              ✓
            </span>
            <span className={cn("flex-1", q.done ? "text-fg" : "text-muted")}>
              {q.label}
            </span>
            <span
              className={cn(
                "shrink-0 text-xs tabular-nums",
                q.done ? "text-accent" : "text-muted",
              )}
            >
              +{q.xp}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function WeeklyPanel({ weekly }: { weekly: GameView["weekly"] }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 text-xs tracking-[0.2em] text-accent/80">
        ⟦ НЕДЕЛЬНЫЙ ВЫЗОВ ⟧
      </div>
      <ul className="space-y-3">
        {weekly.map((w) => {
          const pct = Math.min(w.current / w.target, 1) * 100;
          return (
            <li key={w.key}>
              <div className="mb-1 flex justify-between text-sm">
                <span className={w.done ? "text-fg" : "text-muted"}>
                  {w.done ? "✓ " : ""}
                  {w.label}
                </span>
                <span className="text-xs tabular-nums text-muted">
                  {w.current}/{w.target}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${pct}%`,
                    background: w.done
                      ? "var(--color-success)"
                      : "var(--color-accent)",
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function GatesPanel({ game }: { game: GameView }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 text-xs tracking-[0.2em] text-accent/80">⟦ ВРАТА ⟧</div>
      <div className="mb-3 text-sm text-muted">
        Текущий вес:{" "}
        <span className="font-semibold text-fg">{game.currentWeight} кг</span>
        {game.nextGate && (
          <>
            {" "}· до врат {game.nextGate.rank}-ранга осталось{" "}
            <span className="font-semibold text-accent">
              {Math.max(0, Math.round((game.currentWeight - game.nextGate.kg) * 10) / 10)} кг
            </span>
          </>
        )}
      </div>
      <ul className="space-y-2">
        {game.gates.map((g) => (
          <li key={g.rank} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold",
                g.reached
                  ? "bg-accent/15 text-accent ring-1 ring-accent/50"
                  : "bg-surface-2 text-muted",
              )}
            >
              {g.rank}
            </span>
            <span className={cn("flex-1", g.reached ? "text-fg" : "text-muted")}>
              Врата {g.rank}-ранга · {g.kg} кг
            </span>
            <span className="shrink-0 text-xs">
              {g.reached ? (
                <span className="text-accent">открыты</span>
              ) : (
                <span className="text-muted">закрыты</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
