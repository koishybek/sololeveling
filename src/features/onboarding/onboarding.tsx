"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  NumberField,
  OptionButton,
  ProgressRing,
} from "@/components/ui";
import { computePlan, projectedGoalDate } from "@/lib/nutrition/calories";
import type { ActivityLevel, Goal, Sex } from "@/lib/nutrition/types";
import { addWeight, dayKey, saveProfile, setDailyGoal } from "@/lib/db/repo";
import type { Profile } from "@/lib/db/types";

const GOALS: { key: Goal; label: string; emoji: string }[] = [
  { key: "lose", label: "Похудеть", emoji: "🔻" },
  { key: "maintain", label: "Поддерживать вес", emoji: "⚖️" },
  { key: "gain", label: "Набрать массу", emoji: "🔺" },
];

const ACTIVITIES: { key: ActivityLevel; label: string; desc: string }[] = [
  { key: "sedentary", label: "Сидячий", desc: "Мало движения, офис" },
  { key: "light", label: "Лёгкая", desc: "1–3 тренировки в неделю" },
  { key: "moderate", label: "Умеренная", desc: "3–5 тренировок в неделю" },
  { key: "very", label: "Высокая", desc: "6–7 тренировок в неделю" },
  { key: "extreme", label: "Экстремальная", desc: "Физ. работа + спорт" },
];

function formatDateRu(d: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [target, setTarget] = useState("");
  const [activity, setActivity] = useState<ActivityLevel | null>(null);
  const [deficit, setDeficit] = useState(500);
  const [saving, setSaving] = useState(false);

  const stepKeys = useMemo<string[]>(() => {
    const base = ["goal", "sex", "age", "height", "weight"];
    if (goal && goal !== "maintain") base.push("target");
    base.push("activity");
    if (goal && goal !== "maintain") base.push("pace");
    base.push("generating", "reveal");
    return base;
  }, [goal]);

  const current = stepKeys[Math.min(step, stepKeys.length - 1)];
  const progress = stepKeys.length > 1 ? step / (stepKeys.length - 1) : 0;

  const input = useMemo(
    () => ({
      sex: sex ?? "male",
      age: Number(age) || 0,
      heightCm: Number(height) || 0,
      weightKg: Number(weight) || 0,
      targetWeightKg: Number(target) || Number(weight) || 0,
      activity: activity ?? "sedentary",
      goal: goal ?? "maintain",
      dailyAdjustmentKcal: deficit,
    }),
    [sex, age, height, weight, target, activity, goal, deficit],
  );

  const plan = useMemo(() => computePlan(input), [input]);

  // Auto-advance through the "generating your plan" loader.
  useEffect(() => {
    if (current !== "generating") return;
    const t = setTimeout(() => setStep((s) => s + 1), 1600);
    return () => clearTimeout(t);
  }, [current]);

  const canNext = (): boolean => {
    switch (current) {
      case "goal":
        return goal !== null;
      case "sex":
        return sex !== null;
      case "age":
        return Number(age) >= 10 && Number(age) <= 100;
      case "height":
        return Number(height) >= 100 && Number(height) <= 250;
      case "weight":
        return Number(weight) >= 30 && Number(weight) <= 400;
      case "target":
        return Number(target) >= 30 && Number(target) <= 400;
      case "activity":
        return activity !== null;
      case "pace":
        return true;
      default:
        return true;
    }
  };

  async function finish() {
    setSaving(true);
    const now = Date.now();
    const profile: Profile = {
      id: "me",
      sex: input.sex,
      age: input.age,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      targetWeightKg: input.targetWeightKg,
      activity: input.activity,
      goal: input.goal,
      dailyAdjustmentKcal: input.goal === "maintain" ? 0 : deficit,
      createdAt: now,
      updatedAt: now,
    };
    await saveProfile(profile);
    await setDailyGoal({
      date: dayKey(),
      kcal: plan.goalKcal,
      proteinG: plan.macros.proteinG,
      carbG: plan.macros.carbG,
      fatG: plan.macros.fatG,
    });
    await addWeight({ date: dayKey(), weightKg: input.weightKg });
    // Parent (AppRoot) reacts to the new profile and renders the dashboard.
  }

  const showNav = current !== "generating" && current !== "reveal";

  return (
    <div className="flex min-h-dvh flex-col">
      {/* progress bar */}
      <div className="flex items-center gap-3 p-4">
        {step > 0 && current !== "generating" && current !== "reveal" ? (
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="text-muted"
            aria-label="Назад"
          >
            ←
          </button>
        ) : (
          <span className="w-4" />
        )}
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${Math.max(progress * 100, 4)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-6">
        <div key={current} className="flex-1 [animation:fadeIn_.25s_ease]">
          {current === "goal" && (
            <Step title="Какая у тебя цель?">
              <div className="space-y-3">
                {GOALS.map((g) => (
                  <OptionButton
                    key={g.key}
                    selected={goal === g.key}
                    onClick={() => setGoal(g.key)}
                  >
                    <span className="mr-2">{g.emoji}</span>
                    {g.label}
                  </OptionButton>
                ))}
              </div>
            </Step>
          )}

          {current === "sex" && (
            <Step title="Твой пол?">
              <div className="grid grid-cols-2 gap-3">
                <OptionButton
                  selected={sex === "male"}
                  onClick={() => setSex("male")}
                  className="text-center"
                >
                  ♂ Мужской
                </OptionButton>
                <OptionButton
                  selected={sex === "female"}
                  onClick={() => setSex("female")}
                  className="text-center"
                >
                  ♀ Женский
                </OptionButton>
              </div>
            </Step>
          )}

          {current === "age" && (
            <Step title="Сколько тебе лет?">
              <NumberField
                autoFocus
                value={age}
                onChange={setAge}
                suffix="лет"
                placeholder="20"
              />
            </Step>
          )}

          {current === "height" && (
            <Step title="Твой рост?">
              <NumberField
                autoFocus
                value={height}
                onChange={setHeight}
                suffix="см"
                placeholder="180"
              />
            </Step>
          )}

          {current === "weight" && (
            <Step title="Текущий вес?">
              <NumberField
                autoFocus
                value={weight}
                onChange={setWeight}
                suffix="кг"
                placeholder="100"
              />
            </Step>
          )}

          {current === "target" && (
            <Step title="Целевой вес?">
              <NumberField
                autoFocus
                value={target}
                onChange={setTarget}
                suffix="кг"
                placeholder="85"
              />
            </Step>
          )}

          {current === "activity" && (
            <Step title="Уровень активности?">
              <div className="space-y-3">
                {ACTIVITIES.map((a) => (
                  <OptionButton
                    key={a.key}
                    selected={activity === a.key}
                    onClick={() => setActivity(a.key)}
                  >
                    <div className="font-medium">{a.label}</div>
                    <div className="text-xs text-muted">{a.desc}</div>
                  </OptionButton>
                ))}
              </div>
            </Step>
          )}

          {current === "pace" && (
            <Step title="Скорость прогресса">
              <p className="mb-6 text-sm text-muted">
                {goal === "gain" ? "Профицит" : "Дефицит"} {deficit} ккал/день
                {" → "}
                <span className="text-fg">
                  {plan.weeklyRateKg.toFixed(2)} кг/неделю
                </span>
              </p>
              <input
                type="range"
                min={250}
                max={1000}
                step={50}
                value={deficit}
                onChange={(e) => setDeficit(Number(e.target.value))}
                className="w-full accent-[var(--color-accent)]"
              />
              <div className="mt-1 flex justify-between text-xs text-muted">
                <span>Плавно</span>
                <span>Агрессивно</span>
              </div>
              <Card className="mt-6 text-center">
                <div className="text-xs text-muted">
                  Достигнешь {input.targetWeightKg} кг к
                </div>
                <div className="mt-1 text-lg font-semibold text-accent">
                  {formatDateRu(
                    projectedGoalDate(
                      new Date(),
                      input.weightKg,
                      input.targetWeightKg,
                      deficit,
                    ),
                  )}
                </div>
              </Card>
            </Step>
          )}

          {current === "generating" && (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <div className="size-16 animate-spin rounded-full border-4 border-surface-2 border-t-accent" />
              <div>
                <div className="text-lg font-semibold">Готовим твой план…</div>
                <div className="mt-1 text-sm text-muted">
                  Считаем норму калорий и БЖУ
                </div>
              </div>
            </div>
          )}

          {current === "reveal" && (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center [animation:fadeIn_.4s_ease]">
              <div className="text-sm text-muted">Твоя дневная норма</div>
              <ProgressRing value={1} max={1} size={200} color="var(--color-accent)">
                <div>
                  <div className="text-4xl font-bold tabular-nums">
                    {plan.goalKcal}
                  </div>
                  <div className="text-sm text-muted">ккал / день</div>
                </div>
              </ProgressRing>
              <div className="grid w-full grid-cols-3 gap-3">
                <MacroPill label="Белки" value={plan.macros.proteinG} color="var(--color-protein)" />
                <MacroPill label="Углеводы" value={plan.macros.carbG} color="var(--color-carb)" />
                <MacroPill label="Жиры" value={plan.macros.fatG} color="var(--color-fat)" />
              </div>
            </div>
          )}
        </div>

        {showNav && (
          <Button
            className="w-full"
            disabled={!canNext()}
            onClick={() => setStep((s) => s + 1)}
          >
            Далее
          </Button>
        )}

        {current === "reveal" && (
          <Button className="w-full" disabled={saving} onClick={finish}>
            {saving ? "Сохраняем…" : "Начать путь E-ранга"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="mb-6 mt-4 text-2xl font-semibold">{title}</h1>
      {children}
    </div>
  );
}

function MacroPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="p-3 text-center">
      <div
        className="mx-auto mb-1 size-2 rounded-full"
        style={{ background: color }}
      />
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}, г</div>
    </Card>
  );
}
