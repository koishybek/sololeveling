"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, NumberField, Sheet } from "@/components/ui";
import { db } from "@/lib/db/db";
import {
  dayKey,
  exportData,
  importData,
  resetAll,
  saveProfile,
  setDailyGoal,
} from "@/lib/db/repo";
import type { Profile } from "@/lib/db/types";
import { computePlan } from "@/lib/nutrition/calories";
import type { ActivityLevel, Goal, Sex } from "@/lib/nutrition/types";
import { cn } from "@/lib/utils";

const GOALS: { key: Goal; label: string }[] = [
  { key: "lose", label: "Похудеть" },
  { key: "maintain", label: "Поддержка" },
  { key: "gain", label: "Набор" },
];
const ACTS: { key: ActivityLevel; label: string }[] = [
  { key: "sedentary", label: "Сидячий" },
  { key: "light", label: "Лёгкая" },
  { key: "moderate", label: "Умеренная" },
  { key: "very", label: "Высокая" },
  { key: "extreme", label: "Экстрим" },
];

export function SettingsSheet({
  open,
  onClose,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile;
}) {
  const settings = useLiveQuery(() => db.settings.get("app"));
  const [weight, setWeight] = useState("");
  const [target, setTarget] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [sex, setSex] = useState<Sex>("male");
  const [goal, setGoal] = useState<Goal>("lose");
  const [activity, setActivity] = useState<ActivityLevel>("sedentary");
  const [visionModel, setVisionModel] = useState("gpt-4o");
  const [textModel, setTextModel] = useState("gpt-4o-mini");
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setWeight(String(profile.weightKg));
    setTarget(String(profile.targetWeightKg));
    setAge(String(profile.age));
    setHeight(String(profile.heightCm));
    setSex(profile.sex);
    setGoal(profile.goal);
    setActivity(profile.activity);
    setMsg(null);
  }, [open, profile]);

  useEffect(() => {
    if (settings) {
      setVisionModel(settings.aiVisionModel || "gpt-4o");
      setTextModel(settings.aiTextModel || "gpt-4o-mini");
    }
  }, [settings]);

  async function saveProfileAndPlan() {
    const next: Profile = {
      ...profile,
      sex,
      age: Number(age) || profile.age,
      heightCm: Number(height) || profile.heightCm,
      weightKg: Number(weight) || profile.weightKg,
      targetWeightKg: Number(target) || profile.targetWeightKg,
      activity,
      goal,
      dailyAdjustmentKcal:
        goal === "maintain" ? 0 : profile.dailyAdjustmentKcal || 500,
      updatedAt: Date.now(),
    };
    await saveProfile(next);
    const plan = computePlan({
      sex: next.sex,
      age: next.age,
      heightCm: next.heightCm,
      weightKg: next.weightKg,
      targetWeightKg: next.targetWeightKg,
      activity: next.activity,
      goal: next.goal,
      dailyAdjustmentKcal: next.dailyAdjustmentKcal,
    });
    await setDailyGoal({
      date: dayKey(),
      kcal: plan.goalKcal,
      proteinG: plan.macros.proteinG,
      carbG: plan.macros.carbG,
      fatG: plan.macros.fatG,
    });
    setMsg("Профиль и план обновлены ✓");
  }

  async function saveModels() {
    await db.settings.put({
      id: "app",
      theme: "dark",
      units: "metric",
      aiVisionModel: visionModel.trim() || "gpt-4o",
      aiTextModel: textModel.trim() || "gpt-4o-mini",
      waterTargetMl: settings?.waterTargetMl ?? 2500,
    });
    setMsg("Модели сохранены ✓");
  }

  async function doExport() {
    const json = await exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `erank-backup-${dayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Бэкап скачан ✓");
  }

  async function doImport(file: File) {
    try {
      await importData(await file.text());
      setMsg("Импортировано ✓ перезагрузка…");
      setTimeout(() => location.reload(), 800);
    } catch (e) {
      setMsg("Ошибка импорта: " + (e as Error).message);
    }
  }

  async function doReset() {
    if (!confirm("Стереть ВСЕ данные безвозвратно?")) return;
    await resetAll();
    location.reload();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Настройки">
      <div className="space-y-6">
        <Section title="Профиль и цель">
          <div className="mb-3 grid grid-cols-3 gap-2">
            {GOALS.map((g) => (
              <Chip
                key={g.key}
                active={goal === g.key}
                onClick={() => setGoal(g.key)}
                label={g.label}
              />
            ))}
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Field label="Вес, кг">
              <NumberField value={weight} onChange={setWeight} suffix="кг" />
            </Field>
            <Field label="Цель, кг">
              <NumberField value={target} onChange={setTarget} suffix="кг" />
            </Field>
            <Field label="Возраст">
              <NumberField value={age} onChange={setAge} suffix="лет" />
            </Field>
            <Field label="Рост, см">
              <NumberField value={height} onChange={setHeight} suffix="см" />
            </Field>
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Chip active={sex === "male"} onClick={() => setSex("male")} label="♂ Муж" />
            <Chip active={sex === "female"} onClick={() => setSex("female")} label="♀ Жен" />
          </div>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {ACTS.map((a) => (
              <Chip
                key={a.key}
                active={activity === a.key}
                onClick={() => setActivity(a.key)}
                label={a.label}
              />
            ))}
          </div>
          <Button className="w-full" onClick={saveProfileAndPlan}>
            Пересчитать план
          </Button>
        </Section>

        <Section title="AI-модели (OpenAI)">
          <Field label="Зрение (фото)">
            <TextField value={visionModel} onChange={setVisionModel} placeholder="gpt-4o" />
          </Field>
          <Field label="Текст / голос-разбор">
            <TextField value={textModel} onChange={setTextModel} placeholder="gpt-4o-mini" />
          </Field>
          <Button variant="outline" className="mt-2 w-full" onClick={saveModels}>
            Сохранить модели
          </Button>
        </Section>

        <Section title="Данные">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              e.target.value = "";
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={doExport}>
              ⬇ Экспорт бэкапа
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              ⬆ Импорт
            </Button>
          </div>
          <Button variant="danger" className="mt-2 w-full" onClick={doReset}>
            Стереть все данные
          </Button>
          <p className="mt-2 text-xs text-muted">
            Данные хранятся только на этом устройстве. Делай бэкап регулярно.
          </p>
        </Section>

        {msg && (
          <p className="rounded-lg bg-accent/10 px-3 py-2 text-center text-sm text-accent">
            {msg}
          </p>
        )}
      </div>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs uppercase tracking-wider text-muted">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg py-2 text-xs transition",
        active ? "bg-accent text-base font-semibold" : "bg-surface-2 text-muted",
      )}
    >
      {label}
    </button>
  );
}

function TextField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
    />
  );
}
