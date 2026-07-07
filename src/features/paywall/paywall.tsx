"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { APP_NAME } from "@/lib/app";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";

const FEATURES = [
  "Безлимитное распознавание еды по фото",
  "Голосовой и текстовый ввод без ограничений",
  "Расширенная аналитика и инсайты",
  "Поиск по базе продуктов и штрихкодам",
  "Синхронизация и резервные копии",
];

type Plan = "year" | "month";

/** Static paywall screen (no billing wired up yet). */
export function Paywall({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [plan, setPlan] = useState<Plan>("year");
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col overflow-y-auto bg-base [animation:fadeIn_.2s_ease]">
      <div className="flex justify-end px-4 pt-4">
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="grid size-9 place-items-center rounded-full bg-surface text-muted shadow-card"
        >
          <Icon name="close" size={18} strokeWidth={2.2} />
        </button>
      </div>

      <div className="flex flex-1 flex-col px-6 pb-8">
        <div className="mt-2 flex flex-col items-center text-center">
          <div className="grid size-16 place-items-center rounded-[18px] bg-accent text-white shadow-card">
            <Icon name="leaf" size={32} />
          </div>
          <h1 className="mt-4 text-[30px] font-bold leading-tight tracking-tight">
            {APP_NAME} Pro
          </h1>
          <p className="mt-2 max-w-[280px] text-[15px] text-muted">
            Полный контроль над питанием — без ограничений.
          </p>
        </div>

        <ul className="mt-7 space-y-3">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-hover">
                <Icon name="check" size={14} strokeWidth={2.6} />
              </span>
              <span className="text-[15px]">{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <PlanCard
            active={plan === "year"}
            onClick={() => setPlan("year")}
            title="Год"
            price="3 990 ₸"
            sub="≈ 332 ₸ / мес"
            badge="Выгодно −60%"
          />
          <PlanCard
            active={plan === "month"}
            onClick={() => setPlan("month")}
            title="Месяц"
            price="990 ₸"
            sub="в месяц"
          />
        </div>

        <div className="mt-auto pt-7">
          <Button
            className="w-full"
            onClick={() => {
              toast("Оплата будет подключена позже", "info");
              onClose();
            }}
          >
            Начать 7 дней бесплатно
          </Button>
          <p className="mt-3 text-center text-[12px] text-muted">
            Далее {plan === "year" ? "3 990 ₸ / год" : "990 ₸ / мес"}. Отмена в любой момент.
          </p>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  active,
  onClick,
  title,
  price,
  sub,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  price: string;
  sub: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative rounded-card p-4 text-left transition",
        active
          ? "bg-surface shadow-card ring-2 ring-accent"
          : "bg-surface shadow-card",
      )}
    >
      {badge && (
        <span className="absolute -top-2.5 left-4 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
      <div className="text-[13px] font-semibold uppercase tracking-wider text-muted">{title}</div>
      <div className="mt-1 text-[22px] font-bold tabular-nums">{price}</div>
      <div className="text-[12px] text-muted">{sub}</div>
    </button>
  );
}
