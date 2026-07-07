"use client";

import { useEffect, useState } from "react";
import { Button, NumberField, SegmentedControl, Sheet } from "@/components/ui";
import { deleteLogEntry, updateLogEntry } from "@/lib/db/repo";
import type { LogEntry, Meal } from "@/lib/db/types";

const MEALS: { value: Meal; label: string }[] = [
  { value: "breakfast", label: "Завтрак" },
  { value: "lunch", label: "Обед" },
  { value: "dinner", label: "Ужин" },
  { value: "snack", label: "Перекус" },
];

export function EditEntrySheet({
  entry,
  onClose,
}: {
  entry: LogEntry | null;
  onClose: () => void;
}) {
  const [grams, setGrams] = useState("");
  const [meal, setMeal] = useState<Meal>("lunch");

  useEffect(() => {
    if (entry) {
      setGrams(String(entry.grams));
      setMeal(entry.meal);
    }
  }, [entry]);

  if (!entry) return null;

  const factor = (Number(grams) || entry.grams) / entry.grams;

  async function save() {
    await updateLogEntry(entry!.id, {
      grams: Number(grams) || entry!.grams,
      meal,
    });
    onClose();
  }

  async function remove() {
    await deleteLogEntry(entry!.id);
    onClose();
  }

  return (
    <Sheet open={Boolean(entry)} onClose={onClose} title={entry.foodName}>
      <div className="space-y-5">
        <SegmentedControl options={MEALS} value={meal} onChange={setMeal} />

        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[1.5px] text-muted">
            Порция
          </div>
          <NumberField value={grams} onChange={setGrams} suffix="г" autoFocus />
        </div>

        {/* macro summary */}
        <div className="grid grid-cols-4 gap-2">
          <MacroCard label="Ккал" value={Math.round(entry.kcal * factor)} />
          <MacroCard label="Белки" value={Math.round(entry.proteinG * factor)} color="var(--color-protein)" suffix="г" />
          <MacroCard label="Углев." value={Math.round(entry.carbG * factor)} color="var(--color-carb)" suffix="г" />
          <MacroCard label="Жиры" value={Math.round(entry.fatG * factor)} color="var(--color-fat)" suffix="г" />
        </div>

        <div className="flex gap-2">
          <Button className="flex-1" onClick={save}>
            Сохранить
          </Button>
          <Button variant="danger" onClick={remove}>
            Удалить
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

function MacroCard({
  label,
  value,
  color,
  suffix,
}: {
  label: string;
  value: number;
  color?: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-[14px] bg-surface-2 px-2 py-3 text-center">
      <div className="text-[17px] font-bold tabular-nums" style={color ? { color } : undefined}>
        {value}
        {suffix && <span className="text-[11px] font-normal text-muted">{suffix}</span>}
      </div>
      <div className="mt-0.5 text-[11px] text-muted">{label}</div>
    </div>
  );
}
