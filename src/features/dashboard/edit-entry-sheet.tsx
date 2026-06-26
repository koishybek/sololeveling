"use client";

import { useEffect, useState } from "react";
import { Button, NumberField, Sheet } from "@/components/ui";
import { deleteLogEntry, updateLogEntry } from "@/lib/db/repo";
import type { LogEntry, Meal } from "@/lib/db/types";
import { cn } from "@/lib/utils";

const MEALS: { key: Meal; label: string }[] = [
  { key: "breakfast", label: "Завтрак" },
  { key: "lunch", label: "Обед" },
  { key: "dinner", label: "Ужин" },
  { key: "snack", label: "Перекус" },
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
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {MEALS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMeal(m.key)}
              className={cn(
                "rounded-lg py-2 text-xs transition",
                meal === m.key
                  ? "bg-accent text-base font-semibold"
                  : "bg-surface-2 text-muted",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <NumberField value={grams} onChange={setGrams} suffix="г" autoFocus />

        <div className="text-sm text-muted tabular-nums">
          ≈ {Math.round(entry.kcal * factor)} ккал · Б
          {Math.round(entry.proteinG * factor)} · У
          {Math.round(entry.carbG * factor)} · Ж{Math.round(entry.fatG * factor)}
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
