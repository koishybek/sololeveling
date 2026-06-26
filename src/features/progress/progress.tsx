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
import { db } from "@/lib/db/db";
import { addWeight, dayKey, saveProfile } from "@/lib/db/repo";
import type { Profile } from "@/lib/db/types";
import { buildAnalytics } from "@/lib/analytics";
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

  const latest = weights.length
    ? weights[weights.length - 1].weightKg
    : profile.weightKg;
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
      <h1 className="mb-4 text-xl font-semibold">Прогресс</h1>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Текущий" value={`${latest} кг`} />
        <Stat label="Цель" value={`${profile.targetWeightKg} кг`} />
        <Stat
          label="До цели"
          value={`${toTarget > 0 ? "−" : "+"}${Math.abs(toTarget)} кг`}
          accent
        />
      </div>

      <Card className="mb-4">
        <div className="mb-2 text-sm font-medium">Записать вес сегодня</div>
        <div className="flex gap-2">
          <div className="flex-1">
            <NumberField
              value={value}
              onChange={setValue}
              suffix="кг"
              placeholder={String(latest)}
            />
          </div>
          <Button onClick={save} disabled={!value}>
            Ок
          </Button>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium">Динамика веса</span>
          <span className="text-xs text-muted">
            {changed === 0
              ? "—"
              : `${changed < 0 ? "−" : "+"}${Math.abs(changed)} кг`}
          </span>
        </div>
        {weightData.length >= 2 ? (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--color-muted)" }} />
                <Line type="monotone" dataKey="kg" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3, fill: "var(--color-accent)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted">
            Запиши вес хотя бы дважды, чтобы увидеть график.
          </p>
        )}
      </Card>

      <Card className="mb-4">
        <div className="mb-3 text-sm font-medium">Калории · 14 дней</div>
        {analytics && analytics.daysLogged > 0 ? (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.series} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--color-muted)" }} cursor={{ fill: "var(--color-surface-2)" }} />
                <ReferenceLine y={goal.kcal} stroke="var(--color-muted)" strokeDasharray="4 4" />
                <Bar dataKey="kcal" radius={[3, 3, 0, 0]}>
                  {analytics.series.map((p, i) => (
                    <Cell
                      key={i}
                      fill={
                        p.kcal === 0
                          ? "var(--color-surface-2)"
                          : p.kcal <= p.goal
                            ? "var(--color-accent)"
                            : "var(--color-danger)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted">
            Логируй еду — здесь появится график калорий.
          </p>
        )}
      </Card>

      {analytics && analytics.daysLogged > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Stat label="Ср. калории" value={`${analytics.avgKcal}`} />
          <Stat label="Ср. белок" value={`${analytics.avgProtein} г`} />
          <Stat label="Дней залогир." value={`${analytics.daysLogged}`} />
          <Stat label="В норме" value={`${analytics.adherencePct}%`} accent />
        </div>
      )}

      <Card>
        <div className="mb-3 text-sm font-medium">Консистентность · 5 недель</div>
        {analytics ? (
          <>
            <div className="grid grid-cols-7 gap-1.5">
              {analytics.calendar.map((c) => (
                <div
                  key={c.date}
                  title={c.date}
                  className={cn(
                    "aspect-square rounded",
                    c.state === "under"
                      ? "bg-accent"
                      : c.state === "over"
                        ? "bg-carb"
                        : "bg-surface-2",
                  )}
                />
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-muted">
              <Legend color="bg-accent" label="в норме" />
              <Legend color="bg-carb" label="перебор" />
              <Legend color="bg-surface-2" label="нет лога" />
            </div>
          </>
        ) : null}
      </Card>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
};

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card className="p-3 text-center">
      <div className="text-xs text-muted">{label}</div>
      <div
        className={`mt-1 text-lg font-semibold tabular-nums ${accent ? "text-accent" : ""}`}
      >
        {value}
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
