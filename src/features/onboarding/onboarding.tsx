"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, MacroPill, NumberField, OptionButton, ProgressRing } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { computePlan } from "@/lib/nutrition/calories";
import type { ActivityLevel, Goal, Sex } from "@/lib/nutrition/types";
import { addWeight, dayKey, saveProfile, setDailyGoal } from "@/lib/db/repo";
import type { Profile } from "@/lib/db/types";
import { APP_NAME } from "@/lib/app";
import { cn } from "@/lib/utils";

const GOALS: {
  key: Goal;
  label: string;
  desc: string;
  icon: IconName;
  color: string;
  softBg: string;
}[] = [
  { key: "lose", label: "Похудеть", desc: "Дефицит калорий, чтобы снижать вес плавно.", icon: "trend-down", color: "var(--color-accent)", softBg: "var(--color-accent-soft)" },
  { key: "maintain", label: "Держать вес", desc: "Есть ровно столько, чтобы удерживать форму.", icon: "scale", color: "var(--color-carb)", softBg: "var(--color-carb-soft)" },
  { key: "gain", label: "Набрать массу", desc: "Профицит, чтобы расти и становиться сильнее.", icon: "dumbbell", color: "var(--color-fat)", softBg: "var(--color-fat-soft)" },
];

const ACTIVITIES: { key: ActivityLevel; label: string; desc: string }[] = [
  { key: "sedentary", label: "Сидячий", desc: "Мало движения, офис" },
  { key: "light", label: "Лёгкая", desc: "1–3 тренировки в неделю" },
  { key: "moderate", label: "Умеренная", desc: "3–5 тренировок в неделю" },
  { key: "very", label: "Высокая", desc: "6–7 тренировок в неделю" },
  { key: "extreme", label: "Экстремальная", desc: "Физ. работа + спорт" },
];

const QUIZ = new Set([
  "goal",
  "sex",
  "age",
  "height",
  "weight",
  "target",
  "activity",
  "pace",
]);

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
  const quizKeys = stepKeys.filter((k) => QUIZ.has(k));
  const quizIdx = quizKeys.indexOf(current);

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
  const months = useMemo(() => {
    if (plan.weeklyRateKg <= 0) return 0;
    const weeks = Math.abs(input.weightKg - input.targetWeightKg) / plan.weeklyRateKg;
    return Math.max(1, Math.round(weeks / 4.345));
  }, [plan.weeklyRateKg, input.weightKg, input.targetWeightKg]);

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
  }

  const showQuiz = QUIZ.has(current);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-6">
      {/* progress */}
      {showQuiz && (
        <div className="pt-3">
          <div className="mb-3 flex items-center">
            {step > 0 ? (
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                aria-label="Назад"
                className="grid size-8 place-items-center text-muted"
              >
                <Icon name="chevron-left" size={22} />
              </button>
            ) : (
              <span className="w-8" />
            )}
            <div className="flex-1 text-center text-[11px] font-semibold uppercase tracking-[1.5px] text-accent">
              Шаг {quizIdx + 1} из {quizKeys.length}
            </div>
            <span className="w-8" />
          </div>
          <div className="flex gap-1.5">
            {quizKeys.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i <= quizIdx ? "bg-accent" : "bg-track",
                )}
              />
            ))}
          </div>
        </div>
      )}

      <div key={current} className="flex flex-1 flex-col [animation:fadeInUp_.25s_ease]">
        {current === "goal" && (
          <Step title="Какая у тебя цель?">
            <div className="space-y-3">
              {GOALS.map((g) => (
                <OptionButton key={g.key} selected={goal === g.key} onClick={() => setGoal(g.key)}>
                  <div className="flex items-center gap-4">
                    <div
                      className="grid size-14 shrink-0 place-items-center rounded-full"
                      style={{ background: g.softBg, color: g.color }}
                    >
                      <Icon name={g.icon} size={26} />
                    </div>
                    <div className="flex-1">
                      <div className="text-[19px] font-bold">{g.label}</div>
                      <div className="mt-0.5 text-[14px] leading-snug text-muted">{g.desc}</div>
                    </div>
                    {goal === g.key && (
                      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-white">
                        <Icon name="check" size={16} strokeWidth={2.6} />
                      </div>
                    )}
                  </div>
                </OptionButton>
              ))}
            </div>
          </Step>
        )}

        {current === "sex" && (
          <Step title="Твой пол?">
            <div className="grid grid-cols-2 gap-3">
              <OptionButton selected={sex === "male"} onClick={() => setSex("male")} className="text-center text-[16px] font-semibold">
                ♂ Мужской
              </OptionButton>
              <OptionButton selected={sex === "female"} onClick={() => setSex("female")} className="text-center text-[16px] font-semibold">
                ♀ Женский
              </OptionButton>
            </div>
          </Step>
        )}

        {current === "age" && (
          <Step title="Сколько тебе лет?">
            <NumberField autoFocus value={age} onChange={setAge} suffix="лет" placeholder="20" />
          </Step>
        )}
        {current === "height" && (
          <Step title="Твой рост?">
            <NumberField autoFocus value={height} onChange={setHeight} suffix="см" placeholder="180" />
          </Step>
        )}
        {current === "weight" && (
          <Step title="Текущий вес?">
            <NumberField autoFocus value={weight} onChange={setWeight} suffix="кг" placeholder="100" />
          </Step>
        )}
        {current === "target" && (
          <Step title="Целевой вес?">
            <NumberField autoFocus value={target} onChange={setTarget} suffix="кг" placeholder="85" />
          </Step>
        )}

        {current === "activity" && (
          <Step title="Уровень активности?">
            <div className="space-y-3">
              {ACTIVITIES.map((a) => (
                <OptionButton key={a.key} selected={activity === a.key} onClick={() => setActivity(a.key)}>
                  <div className="font-semibold">{a.label}</div>
                  <div className="text-[13px] text-muted">{a.desc}</div>
                </OptionButton>
              ))}
            </div>
          </Step>
        )}

        {current === "pace" && (
          <Step title="Скорость прогресса">
            <p className="mb-6 text-[15px] text-muted">
              {goal === "gain" ? "Профицит" : "Дефицит"}{" "}
              <span className="font-semibold text-fg">{deficit} ккал/день</span> →{" "}
              <span className="font-semibold text-fg">{plan.weeklyRateKg.toFixed(2)} кг/неделю</span>
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
            <div className="mt-1 flex justify-between text-[12px] text-muted">
              <span>Плавно</span>
              <span>Агрессивно</span>
            </div>
            <div className="mt-6 rounded-card bg-surface p-4 text-center shadow-card">
              <div className="text-[13px] text-muted">
                Достигнешь {input.targetWeightKg} кг примерно за
              </div>
              <div className="mt-1 text-[22px] font-bold text-accent">
                ~{months} {months === 1 ? "месяц" : months < 5 ? "месяца" : "месяцев"}
              </div>
            </div>
          </Step>
        )}

        {current === "generating" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <div className="size-16 animate-spin rounded-full border-4 border-track border-t-accent" />
            <div>
              <div className="text-lg font-bold">Готовим твой план…</div>
              <div className="mt-1 text-[14px] text-muted">Считаем норму калорий и БЖУ</div>
            </div>
          </div>
        )}

        {current === "reveal" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 py-6 text-center [animation:fadeIn_.4s_ease]">
            <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-accent">
              Твой план готов
            </div>
            <ProgressRing value={1} max={1} size={220} stroke={14}>
              <div>
                <div className="text-[54px] font-extrabold leading-none tabular-nums tracking-tight">
                  {plan.goalKcal.toLocaleString("ru-RU")}
                </div>
                <div className="mt-1 text-[14px] text-muted">ккал / день</div>
              </div>
            </ProgressRing>
            <div className="grid w-full grid-cols-3 gap-3">
              <MacroPill iconName="protein" label="Белки" value={`${plan.macros.proteinG} г`} color="var(--color-protein)" softBg="var(--color-protein-soft)" />
              <MacroPill iconName="wheat" label="Углеводы" value={`${plan.macros.carbG} г`} color="var(--color-carb)" softBg="var(--color-carb-soft)" />
              <MacroPill iconName="drop" label="Жиры" value={`${plan.macros.fatG} г`} color="var(--color-fat)" softBg="var(--color-fat-soft)" />
            </div>
            <div className="flex w-full items-center gap-3 rounded-card bg-surface p-4 shadow-card">
              <div className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-hover">
                <Icon name={goal === "gain" ? "dumbbell" : goal === "maintain" ? "scale" : "trend-down"} size={22} />
              </div>
              <div className="text-left text-[15px] font-semibold">
                {goal === "maintain"
                  ? `Поддержание веса · ${input.weightKg} кг`
                  : `Цель: ${input.weightKg} → ${input.targetWeightKg} кг · ~${months} мес`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* actions */}
      {showQuiz && (
        <Button className="w-full" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
          Далее
        </Button>
      )}
      {current === "reveal" && (
        <Button className="w-full" disabled={saving} onClick={finish}>
          {saving ? "Сохраняем…" : `Начать с ${APP_NAME}`}
        </Button>
      )}
    </div>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pt-6">
      <h1 className="mb-6 text-[32px] font-bold leading-tight tracking-tight">{title}</h1>
      {children}
    </div>
  );
}
