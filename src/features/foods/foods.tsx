"use client";

import { useState } from "react";
import { Button, TextInput } from "@/components/ui";
import { Icon } from "@/components/icons";
import { FoodThumb } from "@/components/food-thumb";
import { toast } from "@/components/toast";
import { addLogEntry, toggleFavorite, upsertFood } from "@/lib/db/repo";
import type { FoodItem, Meal } from "@/lib/db/types";
import type { ResolvedFood } from "@/lib/food-data/types";
import { useFavorites, useRecentFoods } from "@/lib/hooks";

function defaultMeal(): Meal {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

export function Foods() {
  const favorites = useFavorites(24) ?? [];
  const recent = useRecentFoods(24) ?? [];
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResolvedFood[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const r = await fetch(`/api/food/search?q=${encodeURIComponent(query)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка поиска");
      setResults(d.foods ?? []);
      if (!d.foods?.length) setError("Ничего не найдено");
    } catch {
      setError("Нет соединения — проверь сеть");
    } finally {
      setSearching(false);
    }
  }

  async function logResolved(f: ResolvedFood) {
    const food = await upsertFood({
      name: f.name,
      source: f.source,
      sourceId: f.sourceId,
      barcode: f.barcode,
      brand: f.brand,
      per100g: f.per100g,
      isWholeFood: f.isWholeFood,
    });
    await addLogEntry({ food, grams: 100, meal: defaultMeal() });
    toast(`${f.name} · 100 г в дневник`, "success");
  }

  async function logFood(f: FoodItem) {
    await addLogEntry({ food: f, grams: 100, meal: defaultMeal() });
    toast(`${f.name} · 100 г в дневник`, "success");
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="text-[26px] font-bold tracking-tight">Продукты</h1>
      <p className="mt-1 text-[14px] text-muted">Найди продукт или добавь из недавних в один тап.</p>

      <div className="mt-4 flex gap-2">
        <TextInput
          value={query}
          onChange={setQuery}
          onKeyDown={(e) => e.key === "Enter" && doSearch()}
          placeholder="Найти продукт в базе"
        />
        <Button className="shrink-0 px-4" onClick={doSearch} disabled={searching || !query.trim()}>
          <Icon name="search" size={18} />
        </Button>
      </div>

      {error && <p className="mt-3 text-center text-[14px] text-muted">{error}</p>}

      {results.length > 0 && (
        <Group title="Результаты">
          {results.map((f, i) => (
            <Row
              key={`${f.sourceId}-${i}`}
              name={f.name}
              kcal100={f.per100g.kcal}
              imageUrl={f.imageUrl}
              onAdd={() => void logResolved(f)}
            />
          ))}
        </Group>
      )}

      {favorites.length > 0 && (
        <Group title="Избранное">
          {favorites.map((f) => (
            <Row
              key={f.id}
              name={f.name}
              kcal100={f.per100g.kcal}
              imageUrl={f.imageUrl}
              faved
              onFav={() => void toggleFavorite(f.id)}
              onAdd={() => void logFood(f)}
            />
          ))}
        </Group>
      )}

      {recent.length > 0 && (
        <Group title="Недавнее">
          {recent.map((f) => (
            <Row
              key={f.id}
              name={f.name}
              kcal100={f.per100g.kcal}
              imageUrl={f.imageUrl}
              faved={f.favorite}
              onFav={() => void toggleFavorite(f.id)}
              onAdd={() => void logFood(f)}
            />
          ))}
        </Group>
      )}

      {!results.length && !favorites.length && !recent.length && (
        <div className="mt-16 flex flex-col items-center text-center text-muted">
          <Icon name="search" size={36} />
          <p className="mt-3 text-[15px]">Пока пусто. Найди продукт выше<br />или залогируй еду через ＋.</p>
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[1.5px] text-accent">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({
  name,
  kcal100,
  imageUrl,
  onAdd,
  faved,
  onFav,
}: {
  name: string;
  kcal100: number;
  imageUrl?: string;
  onAdd: () => void;
  faved?: boolean;
  onFav?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card bg-surface p-3 shadow-card">
      <FoodThumb imageUrl={imageUrl} name={name} size={44} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{name}</div>
        <div className="text-[12px] text-muted">{kcal100} ккал / 100 г</div>
      </div>
      {onFav && (
        <button
          onClick={onFav}
          aria-label="В избранное"
          className={faved ? "text-carb" : "text-muted"}
        >
          <Icon name="star" size={20} filled={faved} />
        </button>
      )}
      <button
        onClick={onAdd}
        aria-label="Добавить в дневник"
        className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-white transition active:scale-90"
      >
        <Icon name="plus" size={17} strokeWidth={2.4} />
      </button>
    </div>
  );
}
