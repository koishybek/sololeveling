"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
    date: w.date.slice(5).split("-").reverse().join("."),
    kg: w.weightKg,
  }));
  const [weighOpen, setWeighOpen] = useState(false);

  // Progress from the starting weight toward the target (works for lose & gain).
  const span = start - profile.targetWeightKg;
  const goalPct =
    span === 0 ? 100 : Math.min(Math.max(((start - latest) / span) * 100, 0), 100);
  const lost = Math.round((start - latest) * 10) / 10;

  async function save() {
    const kg = Number(value);
    if (!kg || kg < 30 || kg > 400) return;
    await addWeight({ date: dayKey(), weightKg: kg });
    await saveProfile({ ...profile, weightKg: kg, updatedAt: Date.now() });
    setValue("");
    setWeighOpen(false);
  }

  return (
    <div className="px-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <h1 className="mb-5 font-display text-[30px] font-medium tracking-tight">Прогресс</h1>

      <div className="mb-3 text-[13px] font-semibold uppercase tracking-[1.5px] text-muted">
        Цель показателя веса
      </div>
      <Card className="mb-4 p-0">
        <div className="flex flex-col items-center px-5 pb-5 pt-6 text-center">
          <div className="grid size-24 place-items-center rounded-[28px] bg-[radial-gradient(circle_at_30%_30%,#b48cff_0%,#6b4bd1_70%)] text-[52px] leading-none shadow-lift">
            ⚖️
          </div>
          <div className="mt-5 font-display text-[26px] leading-tight">
            {lost > 0
              ? `Вы похудели на ${lost.toLocaleString("ru-RU")} кг`
              : lost < 0
                ? `Вы набрали ${Math.abs(lost).toLocaleString("ru-RU")} кг`
                : `Старт: ${start.toLocaleString("ru-RU")} кг`}
          </div>
          <div className="mt-2 text-[15px] text-fg/85">
            {goalPct >= 100
              ? "Цель достигнута! 🎉"
              : toTarget === 0
                ? "Вы на целевом весе"
                : `До цели ${Math.abs(toTarget).toLocaleString("ru-RU")} кг — вы приближаетесь!`}
          </div>
          <div className="mt-5 h-4 w-full overflow-hidden rounded-full bg-base">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-700"
              style={{ width: `${Math.max(goalPct, 3)}%` }}
            />
          </div>
          <div className="mt-2 flex w-full justify-between text-[13px] tabular-nums text-fg/85">
            <span>{start.toLocaleString("ru-RU")} кг</span>
            <span>{profile.targetWeightKg.toLocaleString("ru-RU")} кг</span>
          </div>
        </div>
        <div className="border-t border-border">
          {weighOpen ? (
            <div className="flex gap-2 p-4">
              <div className="flex-1">
                <NumberField value={value} onChange={setValue} suffix="кг" placeholder={String(latest)} autoFocus />
              </div>
              <Button onClick={save} disabled={!value}>
                Ок
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setWeighOpen(true)}
              className="w-full py-4 text-[14px] font-bold uppercase tracking-[1.5px] text-accent"
            >
              Обновить данные о весе
            </button>
          )}
        </div>
      </Card>

      <Card className="mb-4">
        <div className="mb-1 text-center font-display text-[26px]">Ваши успехи</div>
        <div className="mb-3 text-center text-[13px] tabular-nums text-muted">
          {changed === 0 ? "Пока без изменений" : `${changed < 0 ? "−" : "+"}${Math.abs(changed)} кг с начала`}
        </div>
        {weightData.length >= 2 ? (
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weightData} margin={{ top: 30, right: 36, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--color-track)" strokeDasharray="3 5" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 11, fill: "var(--color-muted)" }} tickFormatter={(v: number) => `${Math.round(v)} кг`} axisLine={false} tickLine={false} width={52} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--color-muted)" }} formatter={(v) => [`${v} кг`, "Вес"]} />
                <Area
                  type="linear"
                  dataKey="kg"
                  stroke="var(--color-accent)"
                  strokeWidth={2.5}
                  fill="url(#wgrad)"
                  dot={(p: DotProps) => <WeightDot key={p.index} {...p} count={weightData.length} />}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-6 text-center text-[14px] text-muted">
            Запиши вес хотя бы дважды, чтобы увидеть график.
          </p>
        )}
      </Card>

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

      <Card className="mb-6">
        <div className="mb-3 text-[14px] font-semibold">Калории · 14 дней</div>
        {analytics && analytics.daysLogged > 0 ? (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.series} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
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
      <div className="mb-3 text-[13px] font-semibold uppercase tracking-[1.5px] text-muted">
        Инсайты
      </div>

      {weekly && weekly.loggedDays > 0 && (
        <div className="mb-3">
          <WeeklyInsights w={weekly} />
        </div>
      )}

      <div className="rounded-card bg-accent-soft p-5 shadow-card">
        <div className="flex items-center gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
            <Icon name="flame" size={26} filled />
          </div>
          <div>
            <div className="text-[36px] font-extrabold leading-none tabular-nums text-accent">
              {analytics?.streak ?? 0}
            </div>
            <div className="mt-1 text-[14px] font-medium text-accent/80">
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

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
  value?: unknown;
}

/** Point marker; the last one carries a green value badge (reference design). */
function WeightDot({ cx, cy, index, value, count }: DotProps & { count: number }) {
  if (cx == null || cy == null) return null;
  const last = index === count - 1;
  const kg = Array.isArray(value) ? value[1] : value;
  const text = `${String(kg).replace(".", ",")} кг`;
  const w = text.length * 7.4 + 14;
  return (
    <g>
      <circle cx={cx} cy={cy} r={4.5} fill="var(--color-accent)" />
      {last && (
        <g>
          <rect x={cx - w / 2} y={cy - 34} width={w} height={23} rx={4} fill="var(--color-accent)" />
          <path d={`M${cx - 6} ${cy - 11.5} L${cx} ${cy - 5.5} L${cx + 6} ${cy - 11.5} Z`} fill="var(--color-accent)" />
          <text x={cx} y={cy - 18} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--color-on-accent)">
            {text}
          </text>
        </g>
      )}
    </g>
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
      <div className="rounded-2xl bg-accent p-5 text-on-accent shadow-card">
        <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-on-accent/70">
          Итоги недели
        </div>
        <div className="mt-2 flex items-end gap-2.5">
          <div className="text-[44px] font-extrabold leading-none tabular-nums">
            {w.deficitDays}
          </div>
          <div className="pb-1.5 text-[15px] leading-tight text-on-accent/85">
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
