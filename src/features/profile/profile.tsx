"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, Card, NumberField, SegmentedControl, TextInput, Toggle } from "@/components/ui";
import { Icon } from "@/components/icons";
import { db } from "@/lib/db/db";
import {
  dayKey,
  exportData,
  importData,
  resetAll,
  saveProfile,
  setDailyGoal,
} from "@/lib/db/repo";
import type { Profile as ProfileType } from "@/lib/db/types";
import { computePlan } from "@/lib/nutrition/calories";
import type { ActivityLevel, Goal, Sex } from "@/lib/nutrition/types";
import { APP_NAME } from "@/lib/app";
import { toast } from "@/components/toast";
import { Paywall } from "@/features/paywall/paywall";
import { cn } from "@/lib/utils";

const GOALS: { value: Goal; label: string }[] = [
  { value: "lose", label: "Похудеть" },
  { value: "maintain", label: "Держать" },
  { value: "gain", label: "Набор" },
];
const SEXES: { value: Sex; label: string }[] = [
  { value: "male", label: "♂ Муж" },
  { value: "female", label: "♀ Жен" },
];
const ACTS: { key: ActivityLevel; label: string }[] = [
  { key: "sedentary", label: "Сидячий" },
  { key: "light", label: "Лёгкая" },
  { key: "moderate", label: "Умеренная" },
  { key: "very", label: "Высокая" },
  { key: "extreme", label: "Экстрим" },
];

export function Profile({ profile }: { profile: ProfileType }) {
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
  const [paywall, setPaywall] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWeight(String(profile.weightKg));
    setTarget(String(profile.targetWeightKg));
    setAge(String(profile.age));
    setHeight(String(profile.heightCm));
    setSex(profile.sex);
    setGoal(profile.goal);
    setActivity(profile.activity);
  }, [profile]);

  useEffect(() => {
    if (settings) {
      setVisionModel(settings.aiVisionModel || "gpt-4o");
      setTextModel(settings.aiTextModel || "gpt-4o-mini");
    }
  }, [settings]);

  const remindersOn = settings?.remindersEnabled ?? false;

  async function saveProfileAndPlan() {
    const next: ProfileType = {
      ...profile,
      sex,
      age: Number(age) || profile.age,
      heightCm: Number(height) || profile.heightCm,
      weightKg: Number(weight) || profile.weightKg,
      targetWeightKg: Number(target) || profile.targetWeightKg,
      activity,
      goal,
      dailyAdjustmentKcal: goal === "maintain" ? 0 : profile.dailyAdjustmentKcal || 500,
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
    toast("Профиль и план обновлены", "success");
  }

  async function saveModels() {
    await db.settings.put({
      id: "app",
      theme: "dark",
      units: "metric",
      aiVisionModel: visionModel.trim() || "gpt-4o",
      aiTextModel: textModel.trim() || "gpt-4o-mini",
      waterTargetMl: settings?.waterTargetMl ?? 2500,
      remindersEnabled: settings?.remindersEnabled ?? false,
    });
    toast("Модели сохранены", "success");
  }

  async function setReminders(on: boolean) {
    await db.settings.put({
      id: "app",
      theme: "dark",
      units: "metric",
      aiVisionModel: settings?.aiVisionModel ?? "gpt-4o",
      aiTextModel: settings?.aiTextModel ?? "gpt-4o-mini",
      waterTargetMl: settings?.waterTargetMl ?? 2500,
      remindersEnabled: on,
    });
  }

  async function doExport() {
    const json = await exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calora-backup-${dayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Бэкап скачан", "success");
  }

  async function doImport(file: File) {
    try {
      await importData(await file.text());
      toast("Импортировано, перезагрузка…", "success");
      setTimeout(() => location.reload(), 800);
    } catch (e) {
      toast("Ошибка импорта: " + (e as Error).message, "error");
    }
  }

  async function doReset() {
    if (!confirm("Стереть ВСЕ данные безвозвратно?")) return;
    await resetAll();
    location.reload();
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-5 text-[26px] font-bold tracking-tight">Профиль</h1>

      {/* Pro upsell */}
      <button
        onClick={() => setPaywall(true)}
        className="mb-5 flex w-full items-center gap-3 rounded-card bg-accent p-4 text-left text-white shadow-[0_8px_20px_rgba(95,184,142,0.3)]"
      >
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-white/20">
          <Icon name="leaf" size={22} />
        </div>
        <div className="flex-1">
          <div className="text-[16px] font-bold">{APP_NAME} Pro</div>
          <div className="text-[13px] text-white/85">Безлимит и расширенная аналитика</div>
        </div>
        <Icon name="chevron-right" size={20} />
      </button>

      <Section title="Профиль и цель">
        <div className="mb-3">
          <SegmentedControl options={GOALS} value={goal} onChange={setGoal} />
        </div>
        <div className="mb-3">
          <SegmentedControl options={SEXES} value={sex} onChange={setSex} />
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <Field label="Вес, кг"><NumberField value={weight} onChange={setWeight} suffix="кг" /></Field>
          <Field label="Цель, кг"><NumberField value={target} onChange={setTarget} suffix="кг" /></Field>
          <Field label="Возраст"><NumberField value={age} onChange={setAge} suffix="лет" /></Field>
          <Field label="Рост, см"><NumberField value={height} onChange={setHeight} suffix="см" /></Field>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {ACTS.map((a) => (
            <button
              key={a.key}
              onClick={() => setActivity(a.key)}
              className={cn(
                "rounded-full px-3.5 py-2 text-[13px] font-medium transition",
                activity === a.key ? "bg-accent text-white" : "bg-surface-2 text-muted",
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
        <Button className="w-full" onClick={saveProfileAndPlan}>
          Пересчитать план
        </Button>
      </Section>

      <Section title="Единицы">
        <div className="flex items-center justify-between rounded-[14px] bg-surface-2 px-4 py-3 text-[15px]">
          <span>Система измерений</span>
          <span className="font-semibold">Метрическая (кг, см)</span>
        </div>
      </Section>

      <Section title="Напоминания">
        <div className="flex items-center justify-between rounded-[14px] bg-surface-2 px-4 py-3">
          <div>
            <div className="text-[15px] font-medium">Напоминать логировать</div>
            <div className="text-[12px] text-muted">Пуши о приёмах пищи и воде</div>
          </div>
          <Toggle checked={remindersOn} onChange={(v) => void setReminders(v)} />
        </div>
      </Section>

      <Section title="AI-модели (OpenAI)">
        <Field label="Зрение (фото)">
          <TextInput value={visionModel} onChange={setVisionModel} placeholder="gpt-4o" />
        </Field>
        <div className="mt-2">
          <Field label="Текст / голос-разбор">
            <TextInput value={textModel} onChange={setTextModel} placeholder="gpt-4o-mini" />
          </Field>
        </div>
        <Button variant="secondary" className="mt-3 w-full" onClick={saveModels}>
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
          <Button variant="secondary" onClick={doExport}>
            <Icon name="download" size={16} /> Экспорт
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={16} /> Импорт
          </Button>
        </div>
        <Button variant="danger" className="mt-2 w-full" onClick={doReset}>
          <Icon name="trash" size={16} /> Стереть все данные
        </Button>
        <p className="mt-2 text-[12px] text-muted">
          Данные хранятся только на этом устройстве. Делай бэкап регулярно.
        </p>
      </Section>

      <p className="mt-6 text-center text-[12px] text-muted">{APP_NAME} · v1.0</p>

      <Paywall open={paywall} onClose={() => setPaywall(false)} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[1.5px] text-accent">
        {title}
      </div>
      <Card>{children}</Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] text-muted">{label}</span>
      {children}
    </label>
  );
}
