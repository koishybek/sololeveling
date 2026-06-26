"use client";

import { useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, NumberField, Sheet } from "@/components/ui";
import { toast } from "@/components/toast";
import type { CookingMethod, IdentifiedItem } from "@/lib/ai/food";
import { db } from "@/lib/db/db";
import { getRecentFoods, toggleFavorite } from "@/lib/db/repo";
import type { FoodItem, Meal } from "@/lib/db/types";
import type { ResolvedFood } from "@/lib/food-data/types";
import { cn } from "@/lib/utils";
import { BarcodeScanner } from "./barcode-scanner";
import { commitDrafts, draftMacros } from "./commit";
import { draftFromFood, draftFromResolved, resolveIdentified } from "./resolve";
import type { DraftItem } from "./types";

type Mode = "search" | "photo" | "voice" | "text" | "barcode";

const MEALS: { key: Meal; label: string }[] = [
  { key: "breakfast", label: "Завтрак" },
  { key: "lunch", label: "Обед" },
  { key: "dinner", label: "Ужин" },
  { key: "snack", label: "Перекус" },
];

const MODES: { key: Mode; label: string; icon: string }[] = [
  { key: "search", label: "Поиск", icon: "🔍" },
  { key: "photo", label: "Фото", icon: "📷" },
  { key: "voice", label: "Голос", icon: "🎤" },
  { key: "text", label: "Текст", icon: "⌨️" },
  { key: "barcode", label: "Код", icon: "▦" },
];

const COOKING: { key: CookingMethod; label: string }[] = [
  { key: "raw", label: "Сырое" },
  { key: "boiled", label: "Варёное" },
  { key: "grilled", label: "Гриль" },
  { key: "baked", label: "Запечёное" },
  { key: "sauteed", label: "Жарка" },
  { key: "fried", label: "Фритюр" },
];

function defaultMeal(): Meal {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Не удалось прочитать файл"));
    r.readAsDataURL(file);
  });
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Что-то пошло не так";
}

export function AddEntrySheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [meal, setMeal] = useState<Meal>(defaultMeal);
  const [mode, setMode] = useState<Mode>("search");
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResolvedFood[]>([]);
  const [searching, setSearching] = useState(false);

  const settings = useLiveQuery(() => db.settings.get("app"));
  const favorites =
    useLiveQuery(async () =>
      (await db.foods.toArray()).filter((f) => f.favorite).slice(0, 12),
    ) ?? [];
  const recent = useLiveQuery(() => getRecentFoods(12)) ?? [];

  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const lastScanRef = useRef<{ code: string; t: number }>({ code: "", t: 0 });

  const total = useMemo(
    () =>
      drafts.reduce(
        (acc, d) => {
          const m = draftMacros(d);
          return {
            kcal: acc.kcal + m.kcal,
            proteinG: acc.proteinG + m.proteinG,
            carbG: acc.carbG + m.carbG,
            fatG: acc.fatG + m.fatG,
          };
        },
        { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 },
      ),
    [drafts],
  );

  async function addIdentified(items: IdentifiedItem[]) {
    if (!items.length) {
      setError("Не удалось распознать еду — попробуй ещё раз или введи вручную");
      return;
    }
    const resolved = await Promise.all(items.map(resolveIdentified));
    setDrafts((prev) => [...prev, ...resolved]);
  }

  function addResolved(food: ResolvedFood) {
    setDrafts((prev) => [...prev, draftFromResolved(food)]);
  }
  function addFood(food: FoodItem) {
    setDrafts((prev) => [...prev, draftFromFood(food)]);
  }

  async function doSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const r = await fetch(`/api/food/search?q=${encodeURIComponent(query)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка поиска");
      setResults(d.foods ?? []);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSearching(false);
    }
  }

  async function handlePhoto(file: File) {
    setBusy("Распознаю фото…");
    setError(null);
    try {
      const image = await readDataUrl(file);
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, model: settings?.aiVisionModel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка распознавания");
      await addIdentified(data.items ?? []);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleText() {
    if (!text.trim()) return;
    setBusy("Разбираю текст…");
    setError(null);
    try {
      const res = await fetch("/api/parse-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, model: settings?.aiTextModel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка разбора");
      await addIdentified(data.items ?? []);
      setText("");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        await handleAudio(new Blob(chunksRef.current, { type: "audio/webm" }));
      };
      mr.start();
      recRef.current = mr;
      setRecording(true);
    } catch {
      setError("Нет доступа к микрофону");
    }
  }

  function stopRecording() {
    recRef.current?.stop();
    setRecording(false);
  }

  async function handleAudio(blob: Blob) {
    setBusy("Распознаю речь…");
    try {
      const form = new FormData();
      form.append("audio", blob, "voice.webm");
      const tr = await fetch("/api/transcribe", { method: "POST", body: form });
      const trData = await tr.json();
      if (!tr.ok) throw new Error(trData.error || "Ошибка распознавания речи");
      setBusy("Разбираю еду…");
      const res = await fetch("/api/parse-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trData.text, model: settings?.aiTextModel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка разбора");
      await addIdentified(data.items ?? []);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleBarcode(code: string) {
    const now = Date.now();
    if (lastScanRef.current.code === code && now - lastScanRef.current.t < 3000) {
      return;
    }
    lastScanRef.current = { code, t: now };
    setBusy("Ищу по штрихкоду…");
    setError(null);
    try {
      const res = await fetch(`/api/food/barcode?code=${encodeURIComponent(code)}`);
      if (res.status === 404) {
        setError(`Штрихкод ${code} не найден. Введи вручную через «Текст».`);
        return;
      }
      const data = (await res.json()) as { food?: ResolvedFood; error?: string };
      if (!res.ok || !data.food) throw new Error(data.error || "Ошибка поиска");
      addResolved(data.food);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  function patchDraft(key: string, patch: Partial<DraftItem>) {
    setDrafts((prev) =>
      prev.map((d) =>
        d.key === key ? { ...d, ...patch, correctionMade: true } : d,
      ),
    );
  }
  function removeDraft(key: string) {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
  }

  async function commit() {
    if (!drafts.length) return;
    setBusy("Сохраняю…");
    try {
      await commitDrafts(drafts, meal);
      toast(`Добавлено в дневник (${drafts.length})`, "success");
      reset();
      onClose();
    } catch (e) {
      setError(errMsg(e));
      setBusy(null);
    }
  }

  function reset() {
    setDrafts([]);
    setText("");
    setQuery("");
    setResults([]);
    setError(null);
    setBusy(null);
    setRecording(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Sheet open={open} onClose={handleClose} title="Добавить приём пищи">
      <div className="mb-4 grid grid-cols-4 gap-2">
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

      <div className="mb-4 grid grid-cols-5 gap-1.5">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[11px] transition",
              mode === m.key
                ? "border-accent bg-accent/10 text-fg"
                : "border-border bg-surface text-muted",
            )}
          >
            <span className="text-base">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        {mode === "search" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                placeholder="Найти продукт в базе"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
              />
              <Button variant="outline" onClick={doSearch} disabled={searching || !query.trim()}>
                Найти
              </Button>
            </div>

            {results.length > 0 && (
              <div className="space-y-1.5">
                {results.map((f, i) => (
                  <FoodRow
                    key={`${f.sourceId}-${i}`}
                    name={f.name}
                    kcal100={f.per100g.kcal}
                    onAdd={() => addResolved(f)}
                  />
                ))}
              </div>
            )}

            {favorites.length > 0 && (
              <QuickList title="★ Избранное" foods={favorites} onAdd={addFood} />
            )}
            {recent.length > 0 && (
              <QuickList title="Недавнее" foods={recent} onAdd={addFood} />
            )}
          </div>
        )}

        {mode === "photo" && (
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handlePhoto(f);
                e.target.value = "";
              }}
            />
            <Button
              className="w-full"
              variant="outline"
              disabled={!!busy}
              onClick={() => fileRef.current?.click()}
            >
              📷 Сфотографировать еду
            </Button>
          </div>
        )}

        {mode === "voice" && (
          <div className="flex flex-col items-center gap-3 py-2">
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={!!busy}
              className={cn(
                "grid size-20 place-items-center rounded-full text-3xl transition",
                recording
                  ? "bg-danger/20 text-danger [animation:pulseGlow_1s_ease-in-out_infinite]"
                  : "bg-accent/15 text-accent",
              )}
            >
              🎤
            </button>
            <p className="text-sm text-muted">
              {recording
                ? "Идёт запись… нажми, чтобы остановить"
                : "Нажми и наговори, что съел"}
            </p>
          </div>
        )}

        {mode === "text" && (
          <div className="space-y-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="напр. 2 яйца, тост с маслом и кофе с молоком"
              rows={3}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
            />
            <Button
              className="w-full"
              variant="outline"
              disabled={!!busy || !text.trim()}
              onClick={handleText}
            >
              Распознать
            </Button>
          </div>
        )}

        {mode === "barcode" && <BarcodeScanner onDetected={handleBarcode} />}
      </div>

      {busy && <p className="mb-3 text-center text-sm text-accent">{busy}</p>}
      {error && (
        <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-center text-sm text-danger">
          {error}
        </p>
      )}

      {drafts.length > 0 && (
        <div className="space-y-3">
          {drafts.map((d) => (
            <DraftCard
              key={d.key}
              draft={d}
              onPatch={(p) => patchDraft(d.key, p)}
              onRemove={() => removeDraft(d.key)}
            />
          ))}

          <div className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-sm">
            <span className="text-muted">Итого</span>
            <span className="font-semibold tabular-nums">
              {total.kcal} ккал · Б{total.proteinG} У{total.carbG} Ж{total.fatG}
            </span>
          </div>

          <Button className="w-full" disabled={!!busy} onClick={commit}>
            Добавить {drafts.length}{" "}
            {drafts.length === 1 ? "продукт" : "продукта/ов"}
          </Button>
        </div>
      )}
    </Sheet>
  );
}

function FoodRow({
  name,
  kcal100,
  onAdd,
  faved,
  onToggleFav,
}: {
  name: string;
  kcal100: number;
  onAdd: () => void;
  faved?: boolean;
  onToggleFav?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
      <button onClick={onAdd} className="flex-1 truncate text-left">
        {name}
        <span className="text-muted"> · {kcal100} ккал/100г</span>
      </button>
      {onToggleFav && (
        <button
          onClick={onToggleFav}
          aria-label="В избранное"
          className={cn(faved ? "text-carb" : "text-muted")}
        >
          ★
        </button>
      )}
      <button onClick={onAdd} aria-label="Добавить" className="text-lg text-accent">
        ＋
      </button>
    </div>
  );
}

function QuickList({
  title,
  foods,
  onAdd,
}: {
  title: string;
  foods: FoodItem[];
  onAdd: (f: FoodItem) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 mt-1 text-xs text-muted">{title}</div>
      <div className="space-y-1.5">
        {foods.map((f) => (
          <FoodRow
            key={f.id}
            name={f.name}
            kcal100={f.per100g.kcal}
            onAdd={() => onAdd(f)}
            faved={f.favorite}
            onToggleFav={() => void toggleFavorite(f.id)}
          />
        ))}
      </div>
    </div>
  );
}

function DraftCard({
  draft,
  onPatch,
  onRemove,
}: {
  draft: DraftItem;
  onPatch: (patch: Partial<DraftItem>) => void;
  onRemove: () => void;
}) {
  const m = draftMacros(draft);
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-start gap-2">
        <input
          value={draft.name}
          onChange={(e) => onPatch({ name: e.target.value })}
          className="w-full bg-transparent text-sm font-medium outline-none"
        />
        <button
          onClick={onRemove}
          aria-label="Удалить"
          className="shrink-0 text-muted hover:text-danger"
        >
          ✕
        </button>
      </div>

      <div className="mb-2 flex items-center gap-2">
        <div className="w-28">
          <NumberField
            value={String(draft.grams)}
            onChange={(v) => onPatch({ grams: Math.max(0, Math.round(Number(v) || 0)) })}
            suffix="г"
          />
        </div>
        <div className="flex-1 text-right text-sm tabular-nums">
          <span className="font-semibold">{m.kcal}</span>
          <span className="text-muted"> ккал</span>
          <div className="text-xs text-muted">
            Б{m.proteinG} · У{m.carbG} · Ж{m.fatG}
          </div>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {COOKING.map((c) => (
          <button
            key={c.key}
            onClick={() => onPatch({ cookingMethod: c.key })}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs transition",
              draft.cookingMethod === c.key
                ? "bg-accent text-base"
                : "bg-surface-2 text-muted",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="text-[11px] text-muted">
        {draft.source === "estimate"
          ? "⚠ оценка ИИ (нет в базе)"
          : draft.source === "off"
            ? "штрихкод · Open Food Facts"
            : "база USDA"}
      </div>
    </div>
  );
}
