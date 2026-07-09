"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button, Card, NumberField } from "@/components/ui";
import { Icon } from "@/components/icons";
import { FoodThumb } from "@/components/food-thumb";
import { db } from "@/lib/db/db";
import { addWeight, dayKey, saveProfile } from "@/lib/db/repo";
import type { Profile } from "@/lib/db/types";
import { buildAnalytics, buildWeekly, type WeeklySummary } from "@/lib/analytics";
import { goalFromProfile } from "@/lib/plan";
import { useWeights } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export function Progress({ profile }: { profile: Profile }) {
  const weights = useWeights() ?? [];
  const [value, setValue] = useState("");

  const data = useLiveQuery(async () => {
    const entries = await db.logEntries.toArray();
    const goal = (await db.dailyGoals.get(dayKey())) ?? null;
    return { entries, goal };
  });
  const goal = data?.goal ?? goalFromProfile(profile);
  const analytics = data
    ? buildAnalytics({ entries: data.entries, goal, today: dayKey(), days: 14, calDays: 35 })
    : null;
  const weekly = data ? buildWeekly({ entries: data.entries, goal, today: dayKey() }) : null;

  const latest = weights.length ? weights[weights.length - 1].weightKg : profile.weightKg;
  const start = weights.length ? weights[0].weightKg : profile.weightKg;
  const toTarget = Math.round((latest - profile.targetWeightKg) * 10) / 10;
  const changed = Math.round((latest - start) * 10) / 10;

  const weightData = weights.map((w) => ({
    date: w.date.slice(5).replace("-", "."),
    kg: w.weightKg,
  }));

  async function save() {
    const kg = Number(value);
    if (!kg || kg < 30 || kg > 400) return;
    await addWeight({ date: dayKey(), weightKg: kg });
    await saveProfile({ ...profile, weightKg: kg, updatedAt: Date.now() });
    setValue("");
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-5 text-[26px] font-bold tracking-tight">Прогресс</h1>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Текущий" value={`${latest}`} unit="кг" />
        <Stat label="Цель" value={`${profile.targetWeightKg}`} unit="кг" />
        <Stat
          label="До цели"
          value={`${toTarget > 0 ? "−" : "+"}${Math.abs(toTarget)}`}
          unit="кг"
          accent
        />
      </div>

      <Card className="mb-4">
        <div className="mb-2 text-[14px] font-semibold">Записать вес сегодня</div>
        <div className="flex gap-2">
          <div className="flex-1">
            <NumberField value={value} onChange={setValue} suffix="кг" placeholder={String(latest)} />
          </div>
          <Button onClick={save} disabled={!value}>
            Ок
          </Button>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[14px] font-semibold">Динамика веса</span>
          <span className="text-[13px] tabular-nums text-muted">
            {changed === 0 ? "—" : `${changed < 0 ? "−" : "+"}${Math.abs(changed)} кг`}
          </span>
        </div>
        {weightData.length >= 2 ? (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--color-muted)" }} />
                <Line type="monotone" dataKey="kg" stroke="var(--color-accent)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-accent)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-6 text-center text-[14px] text-muted">
            Запиши вес хотя бы дважды, чтобы увидеть график.
          </p>
        )}
      </Card>

      <Card className="mb-6">
        <div className="mb-3 text-[14px] font-semibold">Калории · 14 дней</div>
        {analytics && analytics.daysLogged > 0 ? (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.series} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--color-muted)" }} cursor={{ fill: "var(--color-surface-2)" }} />
                <ReferenceLine y={goal.kcal} stroke="var(--color-muted)" strokeDasharray="4 4" />
                <Bar dataKey="kcal" radius={[4, 4, 0, 0]}>
                  {analytics.series.map((p, i) => (
                    <Cell key={i} fill={p.kcal === 0 ? "var(--color-track)" : p.kcal <= p.goal ? "var(--color-accent)" : "var(--color-carb)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-6 text-center text-[14px] text-muted">
            Логируй еду — здесь появится график калорий.
          </p>
        )}
      </Card>

      {/* ── Insights ── */}
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[1.5px] text-accent">
        Инсайты
      </div>

      {weekly && weekly.loggedDays > 0 && (
        <div className="mb-3">
          <WeeklyInsights w={weekly} />
        </div>
      )}

      <div className="rounded-card bg-accent-soft p-5 shadow-card">
        <div className="flex items-center gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-full bg-accent text-white">
            <Icon name="flame" size={26} filled />
          </div>
          <div>
            <div className="text-[36px] font-extrabold leading-none tabular-nums text-accent-hover">
              {analytics?.streak ?? 0}
            </div>
            <div className="mt-1 text-[14px] font-medium text-accent-hover/80">
              {(analytics?.streak ?? 0) === 1 ? "день подряд" : "дней подряд"}
            </div>
          </div>
        </div>
      </div>

      {analytics && analytics.daysLogged > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat label="Ср. калории" value={`${analytics.avgKcal}`} />
          <Stat label="Ср. белок" value={`${analytics.avgProtein}`} unit="г" />
          <Stat label="Дней залогир." value={`${analytics.daysLogged}`} />
          <Stat label="В норме" value={`${analytics.adherencePct}`} unit="%" accent />
        </div>
      )}

      <Card className="mt-3">
        <div className="mb-3 text-[14px] font-semibold">Консистентность · 5 недель</div>
        {analytics ? (
          <>
            <div className="grid grid-cols-7 gap-1.5">
              {analytics.calendar.map((c) => (
                <div
                  key={c.date}
                  title={c.date}
                  className={cn(
                    "aspect-square rounded-md",
                    c.state === "under" ? "bg-accent" : c.state === "over" ? "bg-carb" : "bg-track",
                  )}
                />
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-[12px] text-muted">
              <Legend color="bg-accent" label="в норме" />
              <Legend color="bg-carb" label="перебор" />
              <Legend color="bg-track" label="нет лога" />
            </div>
          </>
        ) : null}
      </Card>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 14,
  fontSize: 12,
  boxShadow: "var(--shadow-card)",
};

function WeeklyInsights({ w }: { w: WeeklySummary }) {
  const over = w.kcalDeltaAvg > 0;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-accent p-5 text-white shadow-card">
        <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-white/80">
          Итоги недели
        </div>
        <div className="mt-2 flex items-end gap-2.5">
          <div className="text-[44px] font-extrabold leading-none tabular-nums">
            {w.deficitDays}
          </div>
          <div className="pb-1.5 text-[15px] leading-tight text-white/90">
            из {w.loggedDays} дн.
            <br />в норме калорий
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-[12px] text-muted">Откл. от нормы</div>
          <div
            className={cn(
              "mt-1 text-[19px] font-bold tabular-nums",
              over ? "text-danger" : "text-accent",
            )}
          >
            {over ? "+" : ""}
            {w.kcalDeltaAvg}
            <span className="text-[12px] font-normal text-muted"> ккал/д</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[12px] text-muted">Ср. белок</div>
          <div className="mt-1 text-[19px] font-bold tabular-nums">
            {w.avgProtein}
            <span className="text-[12px] font-normal text-muted"> г/д</span>
          </div>
        </Card>
      </div>

      {w.topFood && (
        <Card className="flex items-center gap-3 p-3.5">
          <FoodThumb name={w.topFood.name} size={44} />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] text-muted">Чаще всего на неделе</div>
            <div className="truncate text-[15px] font-semibold">{w.topFood.name}</div>
          </div>
          <div className="shrink-0 rounded-full bg-surface-2 px-3 py-1 text-[13px] font-bold tabular-nums">
            ×{w.topFood.count}
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <Card className="p-3.5 text-center">
      <div className="text-[12px] text-muted">{label}</div>
      <div className={cn("mt-1 text-[19px] font-bold tabular-nums", accent && "text-accent")}>
        {value}
        {unit && <span className="text-[12px] font-normal text-muted"> {unit}</span>}
      </div>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-3 rounded", color)} />
      {label}
    </span>
  );
}
