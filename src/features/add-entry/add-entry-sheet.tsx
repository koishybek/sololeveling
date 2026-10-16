"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, Slider, Tag } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { FoodThumb } from "@/components/food-thumb";
import { toast } from "@/components/toast";
import type { IdentifiedItem } from "@/lib/ai/food";
import { db } from "@/lib/db/db";
import { addLogEntry, dayKey, scaleMacros, toggleFavorite, upsertFood } from "@/lib/db/repo";
import type { FoodItem, Meal } from "@/lib/db/types";
import type { ResolvedFood } from "@/lib/food-data/types";
import { cn } from "@/lib/utils";
import { commitDrafts, draftMacros } from "./commit";
import { draftFromFood, draftFromResolved, resolveIdentified } from "./resolve";
import type { DraftItem } from "./types";

/** What to add to: a meal and a day. Both default (by clock / today). */
export interface AddTarget {
  meal?: Meal;
  date?: string;
}

const MEALS: { key: Meal; label: string }[] = [
  { key: "breakfast", label: "Завтрак" },
  { key: "lunch", label: "Обед" },
  { key: "dinner", label: "Ужин" },
  { key: "snack", label: "Перекус" },
];

function mealLabel(m: Meal): string {
  return MEALS.find((x) => x.key === m)?.label ?? "";
}

function plural(n: number): string {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return "позицию";
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "позиции";
  return "позиций";
}

function defaultMeal(): Meal {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

function prevDay(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

/** Decode an image file and re-encode it as a JPEG no larger than `max` px. */
function imageToJpeg(src: File | string, max: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = typeof src === "string" ? src : URL.createObjectURL(src);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch {
        reject(new Error("Не удалось обработать фото"));
      } finally {
        if (typeof src !== "string") URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      if (typeof src !== "string") URL.revokeObjectURL(url);
      reject(new Error("Не удалось открыть фото — попробуй другое"));
    };
    img.src = url;
  });
}

function errMsg(e: unknown): string {
  const m = e instanceof Error ? e.message : "";
  if (
    (typeof navigator !== "undefined" && navigator.onLine === false) ||
    /failed to fetch|networkerror|load failed|err_name_not_resolved/i.test(m)
  ) {
    return "Нет соединения с интернетом — проверь сеть и попробуй ещё раз.";
  }
  return m || "Что-то пошло не так";
}

/** Read a JSON API response, tolerating non-JSON error pages (e.g. 413). */
async function readJson<T>(res: Response, fallback: string): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(
      data.error || (res.status === 413 ? "Файл слишком большой" : fallback),
    );
  }
  return data;
}

/** A previously logged food with the portion it was last logged at. */
interface RecentItem {
  food: FoodItem;
  grams: number;
}

export function AddEntrySheet({
  target,
  onClose,
}: {
  target: AddTarget | null;
  onClose: () => void;
}) {
  const open = target !== null;
  const date = target?.date ?? dayKey();
  const isToday = date === dayKey();

  const [meal, setMeal] = useState<Meal>(defaultMeal);
  const [mealMenu, setMealMenu] = useState(false);
  const [tab, setTab] = useState<"recent" | "favorites">("recent");
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResolvedFood[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Fresh state every time the screen opens.
  useEffect(() => {
    if (!target) return;
    setMeal(target.meal ?? defaultMeal());
    setMealMenu(false);
    setTab("recent");
    setDrafts([]);
    setQuery("");
    setResults([]);
    setError(null);
    setBusy(null);
    setPreview(null);
    setAdded(new Set());
  }, [target]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const allFoods = useLiveQuery(() => db.foods.toArray(), []) ?? [];

  const recent = useLiveQuery(async (): Promise<RecentItem[]> => {
    const entries = await db.logEntries.orderBy("createdAt").reverse().limit(200).toArray();
    const seen = new Set<string>();
    const picked: { foodId: string; grams: number }[] = [];
    for (const e of entries) {
      const k = e.foodName.trim().toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      picked.push({ foodId: e.foodId, grams: e.grams });
      if (picked.length >= 20) break;
    }
    const foods = await db.foods.bulkGet(picked.map((p) => p.foodId));
    return picked.flatMap((p, i) => (foods[i] ? [{ food: foods[i], grams: p.grams }] : []));
  }, []) ?? [];

  const yesterday = useLiveQuery(
    async () =>
      (await db.logEntries.where("date").equals(prevDay(date)).toArray()).filter(
        (e) => e.meal === meal,
      ),
    [date, meal],
  ) ?? [];

  const favorites = allFoods.filter((f) => f.favorite);

  const q = query.trim().toLowerCase();
  const localMatches = useMemo(
    () => (q ? allFoods.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 8) : []),
    [allFoods, q],
  );

  // Debounced online search (Open Food Facts / USDA).
  useEffect(() => {
    setSearchError(null);
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/food/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const d = await readJson<{ foods?: ResolvedFood[]; error?: string }>(r, "Ошибка поиска");
        setResults(d.foods ?? []);
        if (d.error) setSearchError(d.error);
      } catch (e) {
        if (!ctrl.signal.aborted) setSearchError(errMsg(e));
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const total = useMemo(
    () => drafts.reduce((s, d) => s + draftMacros(d).kcal, 0),
    [drafts],
  );

  /* ── instant add (one tap, like recents in Lifesum) ── */

  function flashAdded(key: string) {
    setAdded((prev) => new Set(prev).add(key));
  }

  async function quickAddFood(food: FoodItem, grams: number) {
    await addLogEntry({ food, grams, meal, date });
    flashAdded(food.id);
    toast(`${food.name} · ${grams} г → ${mealLabel(meal)}`, "success");
  }

  async function quickAddResolved(f: ResolvedFood, key: string) {
    const food = await upsertFood({
      name: f.name,
      source: f.source,
      sourceId: f.sourceId,
      barcode: f.barcode,
      brand: f.brand,
      per100g: f.per100g,
      isWholeFood: f.isWholeFood,
      imageUrl: f.imageUrl,
    });
    await addLogEntry({ food, grams: 100, meal, date });
    flashAdded(key);
    toast(`${f.name} · 100 г → ${mealLabel(meal)}`, "success");
  }

  async function repeatYesterday() {
    for (const e of yesterday) {
      const food = await db.foods.get(e.foodId);
      if (food) await addLogEntry({ food, grams: e.grams, meal, date });
    }
    flashAdded("yesterday");
    toast(`Повторили ${mealLabel(meal).toLowerCase()} со вчера`, "success");
  }

  /* ── AI: photo & voice → drafts to review ── */

  async function addIdentified(items: IdentifiedItem[], imageUrl?: string) {
    if (!items.length) {
      setError("Не удалось распознать еду — попробуй ещё раз или найди через поиск");
      return;
    }
    const resolved = await Promise.all(items.map(resolveIdentified));
    const withImg = imageUrl ? resolved.map((d) => ({ ...d, imageUrl })) : resolved;
    setDrafts((prev) => [...prev, ...withImg]);
  }

  async function handlePhoto(file: File) {
    setBusy("Распознаю фото…");
    setError(null);
    try {
      // Phone photos are 3–10 MB; the API body limit is ~4 MB.
      const image = await imageToJpeg(file, 1280, 0.82);
      setPreview(image);
      const thumb = await imageToJpeg(image, 160, 0.72).catch(() => undefined);
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await readJson<{ items?: IdentifiedItem[] }>(res, "Ошибка распознавания");
      await addIdentified(data.items ?? [], thumb);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
      setPreview(null);
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
        // iOS Safari records audio/mp4, Chrome audio/webm — keep the real type.
        const type = mr.mimeType || "audio/webm";
        await handleAudio(new Blob(chunksRef.current, { type }), type);
      };
      mr.start();
      recRef.current = mr;
      setRecording(true);
    } catch {
      setError("Нет доступа к микрофону — разреши его в настройках браузера");
    }
  }

  function stopRecording() {
    recRef.current?.stop();
    setRecording(false);
  }

  async function handleAudio(blob: Blob, type: string) {
    if (blob.size < 1000) {
      setError("Запись слишком короткая — скажи, что съел, и нажми «Стоп»");
      return;
    }
    setBusy("Распознаю речь…");
    try {
      const ext = /mp4|m4a|aac/.test(type) ? "m4a" : /ogg/.test(type) ? "ogg" : "webm";
      const form = new FormData();
      form.append("audio", blob, `voice.${ext}`);
      const tr = await fetch("/api/transcribe", { method: "POST", body: form });
      const { text } = await readJson<{ text: string }>(tr, "Ошибка распознавания речи");
      if (!text?.trim()) throw new Error("Не расслышал — попробуй ещё раз");
      setBusy(`«${text.trim()}» — разбираю…`);
      const res = await fetch("/api/parse-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await readJson<{ items?: IdentifiedItem[] }>(res, "Ошибка разбора");
      await addIdentified(data.items ?? []);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  function patchDraft(key: string, patch: Partial<DraftItem>) {
    setDrafts((prev) =>
      prev.map((d) => (d.key === key ? { ...d, ...patch, correctionMade: true } : d)),
    );
  }
  function removeDraft(key: string) {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
  }

  async function commit() {
    if (!drafts.length) return;
    setBusy("Сохраняю…");
    try {
      await commitDrafts(drafts, meal, date);
      toast(`Добавлено: ${drafts.length} ${plural(drafts.length)}`, "success");
      onClose();
    } catch (e) {
      setError(errMsg(e));
      setBusy(null);
    }
  }

  function handleClose() {
    if (recording) {
      recRef.current?.stop();
      setRecording(false);
    }
    onClose();
  }

  if (!open) return null;

  const hasDrafts = drafts.length > 0;
  const dateHint = isToday
    ? null
    : new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(
        new Date(`${date}T00:00:00`),
      );

  return createPortal(
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-base [animation:fadeInUp_.22s_ease]">
      {/* header */}
      <div className="shrink-0 bg-surface px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-card">
        <div className="relative flex items-center justify-between">
          <button
            onClick={handleClose}
            aria-label="Закрыть"
            className="grid size-11 place-items-center rounded-full bg-surface-2 transition active:scale-90"
          >
            <Icon name="close" size={20} strokeWidth={2.4} />
          </button>
          <button
            onClick={() => setMealMenu((v) => !v)}
            aria-expanded={mealMenu}
            className="flex flex-col items-center"
          >
            <span className="flex items-center gap-1 text-[17px] font-semibold">
              {mealLabel(meal)}
              <Icon name="chevron-down" size={16} strokeWidth={2.4} className="text-muted" />
            </span>
            {dateHint && <span className="text-[12px] text-muted">{dateHint}</span>}
          </button>
          <div className="size-11" aria-hidden />

          {mealMenu && (
            <div className="absolute left-1/2 top-12 z-10 w-48 -translate-x-1/2 overflow-hidden rounded-[16px] bg-surface-3 shadow-lift">
              {MEALS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setMeal(m.key);
                    setMealMenu(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-3 text-left text-[15px]",
                    m.key === meal && "font-semibold text-accent",
                  )}
                >
                  {m.label}
                  {m.key === meal && <Icon name="check" size={16} strokeWidth={2.6} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* search */}
        <div className="mt-3 flex items-center gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-full bg-surface-2 px-4 py-3 focus-within:ring-2 focus-within:ring-accent/40">
            <Icon name="search" size={18} className="shrink-0 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Продукт, блюдо или бренд"
              enterKeyHint="search"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Очистить поиск" className="text-muted">
                <Icon name="close" size={16} strokeWidth={2.4} />
              </button>
            )}
          </label>
          <button
            onClick={() => cameraRef.current?.click()}
            disabled={!!busy}
            aria-label="Сфотографировать еду"
            className="grid size-12 shrink-0 place-items-center rounded-[14px] text-accent transition active:scale-90 disabled:opacity-40"
          >
            <Icon name="camera" size={26} />
          </button>
        </div>
      </div>

      <input
        ref={cameraRef}
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
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handlePhoto(f);
          e.target.value = "";
        }}
      />

      {/* body */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-32 pt-4">
        {/* AI quick actions */}
        {!q && (
          <div className="rounded-[18px] border border-accent/70 bg-surface p-3">
            {recording ? (
              <div className="flex items-center gap-3 px-1 py-1">
                <span className="relative grid size-12 shrink-0 place-items-center rounded-full bg-danger/15 text-danger">
                  <span className="absolute inset-0 animate-ping rounded-full bg-danger/20" />
                  <Icon name="mic" size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold">Слушаю…</div>
                  <div className="text-[13px] text-muted">Скажи, что и сколько съел</div>
                </div>
                <Button className="px-4 py-2.5" onClick={stopRecording}>
                  <Icon name="stop" size={16} filled /> Стоп
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-2.5 px-1 text-[15px] font-semibold">
                  Добавь быстрее с помощью ИИ ✨
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <AiAction icon="camera" label="Камера" disabled={!!busy} onClick={() => cameraRef.current?.click()} />
                  <AiAction icon="image" label="Галерея" disabled={!!busy} onClick={() => galleryRef.current?.click()} />
                  <AiAction icon="mic" label="Голос" disabled={!!busy} onClick={startRecording} />
                </div>
              </>
            )}
          </div>
        )}

        {busy && (
          <div className="mt-3 flex items-center gap-3 rounded-[18px] bg-surface p-3">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="size-14 shrink-0 rounded-[12px] object-cover" />
            ) : null}
            <span className="size-5 shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
            <span className="min-w-0 flex-1 text-[14px] font-medium">{busy}</span>
          </div>
        )}
        {error && (
          <p className="mt-3 rounded-[14px] bg-danger/12 px-3 py-2.5 text-center text-[14px] text-danger">
            {error}
          </p>
        )}

        {/* drafts from AI */}
        {hasDrafts && (
          <>
            <ListTitle>Проверь порции</ListTitle>
            <div className="space-y-2.5">
              {drafts.map((d) => (
                <DraftCard
                  key={d.key}
                  draft={d}
                  onGrams={(g) => patchDraft(d.key, { grams: g })}
                  onRename={(name) => patchDraft(d.key, { name })}
                  onRemove={() => removeDraft(d.key)}
                />
              ))}
            </div>
          </>
        )}

        {q ? (
          <>
            {localMatches.length > 0 && (
              <>
                <ListTitle>Мои продукты</ListTitle>
                <div className="space-y-2.5">
                  {localMatches.map((f) => (
                    <FoodRow
                      key={f.id}
                      name={f.name}
                      kcal={f.per100g.kcal}
                      portion="100 г"
                      imageUrl={f.imageUrl}
                      verified={f.source === "usda" || f.source === "off"}
                      added={added.has(f.id)}
                      onOpen={() => setDrafts((p) => [...p, draftFromFood(f)])}
                      onAdd={() => void quickAddFood(f, 100)}
                    />
                  ))}
                </div>
              </>
            )}
            <ListTitle>
              В базе продуктов
              {searching && (
                <span className="ml-2 inline-block size-3 animate-spin rounded-full border-2 border-muted/30 border-t-muted align-middle" />
              )}
            </ListTitle>
            {results.length > 0 ? (
              <div className="space-y-2.5">
                {results.map((f, i) => {
                  const key = `r-${f.sourceId}-${i}`;
                  return (
                    <FoodRow
                      key={key}
                      name={f.name}
                      sub={f.brand}
                      kcal={f.per100g.kcal}
                      portion="100 г"
                      imageUrl={f.imageUrl}
                      verified
                      added={added.has(key)}
                      onOpen={() => setDrafts((p) => [...p, draftFromResolved(f)])}
                      onAdd={() => void quickAddResolved(f, key)}
                    />
                  );
                })}
              </div>
            ) : (
              !searching && (
                <p className="py-6 text-center text-[14px] text-muted">
                  {q.length < 2
                    ? "Введи хотя бы 2 буквы"
                    : searchError ?? "Ничего не нашлось — попробуй сфотографировать"}
                </p>
              )
            )}
          </>
        ) : (
          <>
            {/* recent / favorites tabs */}
            <div className="mt-4 flex gap-1 rounded-full bg-surface p-1">
              <TabIcon icon="clock" label="Недавние" active={tab === "recent"} onClick={() => setTab("recent")} />
              <TabIcon icon="heart" label="Избранное" active={tab === "favorites"} onClick={() => setTab("favorites")} />
            </div>

            {tab === "recent" ? (
              <>
                {yesterday.length > 0 && (
                  <>
                    <ListTitle>То же, что и вчера?</ListTitle>
                    <div className="flex items-center gap-3 rounded-[18px] bg-surface p-4">
                      <div className="flex -space-x-2">
                        {yesterday.slice(0, 3).map((e) => (
                          <FoodThumb
                            key={e.id}
                            imageUrl={e.imageUrl}
                            name={e.foodName}
                            size={36}
                            className="rounded-full ring-2 ring-surface"
                          />
                        ))}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-[15px] font-medium">
                          {yesterday.map((e) => e.foodName).join(", ")}
                        </div>
                        <div className="text-[12px] text-muted">
                          {yesterday.reduce((s, e) => s + e.kcal, 0)} ккал
                        </div>
                      </div>
                      <AddButton
                        label="Повторить вчерашнее"
                        done={added.has("yesterday")}
                        onClick={() => void repeatYesterday()}
                      />
                    </div>
                  </>
                )}

                <ListTitle>Недавние</ListTitle>
                {recent.length ? (
                  <div className="space-y-2.5">
                    {recent.map(({ food, grams }) => (
                      <FoodRow
                        key={food.id}
                        name={food.name}
                        kcal={scaleMacros(food.per100g, grams).kcal}
                        portion={`${grams} г`}
                        imageUrl={food.imageUrl}
                        verified={food.source === "usda" || food.source === "off"}
                        added={added.has(food.id)}
                        onOpen={() => setDrafts((p) => [...p, draftFromFood(food, grams)])}
                        onAdd={() => void quickAddFood(food, grams)}
                      />
                    ))}
                  </div>
                ) : (
                  <Empty>Здесь появится то, что ты уже ел.<br />Начни с фото или поиска 👆</Empty>
                )}
              </>
            ) : favorites.length ? (
              <>
                <ListTitle>Избранное</ListTitle>
                <div className="space-y-2.5">
                  {favorites.map((f) => (
                    <FoodRow
                      key={f.id}
                      name={f.name}
                      kcal={f.per100g.kcal}
                      portion="100 г"
                      imageUrl={f.imageUrl}
                      verified={f.source === "usda" || f.source === "off"}
                      added={added.has(f.id)}
                      onFav={() => void toggleFavorite(f.id)}
                      faved
                      onOpen={() => setDrafts((p) => [...p, draftFromFood(f)])}
                      onAdd={() => void quickAddFood(f, 100)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <Empty>Отмечай продукты ♥ в разделе «Продукты» —<br />они появятся здесь.</Empty>
            )}
          </>
        )}
      </div>

      {/* commit bar for reviewed drafts */}
      {hasDrafts && (
        <div
          className="absolute inset-x-0 bottom-0 flex items-center gap-4 border-t border-border bg-surface px-4 pt-3"
          style={{ paddingBottom: "max(0.9rem, env(safe-area-inset-bottom))" }}
        >
          <div className="text-[22px] font-bold tabular-nums">
            {total} <span className="text-[13px] font-normal text-muted">ккал</span>
          </div>
          <Button className="flex-1" disabled={!!busy} onClick={commit}>
            Добавить {drafts.length} {plural(drafts.length)}
          </Button>
        </div>
      )}
    </div>,
    document.body,
  );
}

function ListTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 mt-6 text-[13px] font-semibold uppercase tracking-[1.5px] text-muted">
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-[14px] leading-relaxed text-muted">{children}</p>;
}

function AiAction({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1.5 rounded-[14px] bg-surface-2 py-3.5 text-accent transition active:scale-95 disabled:opacity-40"
    >
      <Icon name={icon} size={24} />
      <span className="text-[13px] font-semibold text-fg">{label}</span>
    </button>
  );
}

function TabIcon({
  icon,
  label,
  active,
  onClick,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-[13px] font-semibold transition",
        active ? "bg-surface-3 text-accent" : "text-muted",
      )}
    >
      <Icon name={icon} size={20} filled={active && icon === "heart"} />
      {label}
    </button>
  );
}

function AddButton({
  label,
  done,
  onClick,
}: {
  label: string;
  done?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full transition active:scale-90",
        done ? "bg-accent text-on-accent" : "bg-surface-2 text-fg",
      )}
    >
      <Icon name={done ? "check" : "plus"} size={20} strokeWidth={2.4} />
    </button>
  );
}

function FoodRow({
  name,
  sub,
  kcal,
  portion,
  imageUrl,
  verified,
  added,
  faved,
  onFav,
  onOpen,
  onAdd,
}: {
  name: string;
  sub?: string;
  kcal: number;
  portion: string;
  imageUrl?: string;
  verified?: boolean;
  added?: boolean;
  faved?: boolean;
  onFav?: () => void;
  onOpen: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] bg-surface py-3.5 pl-3.5 pr-3">
      <FoodThumb imageUrl={imageUrl} name={name} size={44} className="rounded-full" />
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="truncate text-[16px] font-medium">{name}</div>
        <div className="mt-0.5 flex items-center gap-1 text-[13px] text-muted">
          <span className="text-fg/80">{kcal} ккал</span>
          {verified && <Icon name="verified" size={14} filled className="text-carb" />}
        </div>
        <div className="truncate text-[12px] text-muted">
          ✎ · {portion}
          {sub ? ` · ${sub}` : ""}
        </div>
      </button>
      {onFav && (
        <button onClick={onFav} aria-label={faved ? "Убрать из избранного" : "В избранное"} className={faved ? "text-protein" : "text-muted"}>
          <Icon name="heart" size={20} filled={faved} />
        </button>
      )}
      <AddButton label={`Добавить ${name}`} done={added} onClick={onAdd} />
    </div>
  );
}

const MULTIPLIERS: { label: string; f: number }[] = [
  { label: "½", f: 0.5 },
  { label: "S", f: 0.75 },
  { label: "M", f: 1 },
  { label: "L", f: 1.5 },
  { label: "×2", f: 2 },
];

const snap = (g: number) => Math.max(5, Math.round(g / 5) * 5);

function DraftCard({
  draft,
  onGrams,
  onRename,
  onRemove,
}: {
  draft: DraftItem;
  onGrams: (g: number) => void;
  onRename: (name: string) => void;
  onRemove: () => void;
}) {
  const m = draftMacros(draft);
  const base = draft.baseGrams || draft.grams || 100;
  const max = Math.max(300, snap(base * 3));
  const activeF = MULTIPLIERS.find((x) => snap(base * x.f) === draft.grams)?.f;
  const lowConf =
    draft.source === "estimate" && draft.confidence != null && draft.confidence < 0.6;

  return (
    <div className="relative rounded-[18px] bg-surface p-4">
      <div className="flex items-start gap-3">
        <FoodThumb imageUrl={draft.imageUrl} name={draft.name} size={52} />
        <div className="min-w-0 flex-1 pr-7">
          <input
            value={draft.name}
            onChange={(e) => onRename(e.target.value)}
            aria-label="Название"
            className="w-full bg-transparent text-[16px] font-semibold outline-none"
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {draft.source === "estimate" && <Tag tone="sage">Оценка ИИ</Tag>}
            {draft.source === "off" && <Tag tone="neutral">Open Food Facts</Tag>}
            {draft.source === "usda" && <Tag tone="neutral">USDA</Tag>}
          </div>
        </div>
        <button
          onClick={onRemove}
          aria-label="Убрать"
          className="absolute right-3 top-3 grid size-7 place-items-center rounded-full text-muted transition hover:text-danger"
        >
          <Icon name="close" size={14} strokeWidth={2.4} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <MacroMini label="ккал" value={m.kcal} strong />
        <MacroMini label="белки" value={m.proteinG} unit="г" color="var(--color-protein)" />
        <MacroMini label="углев" value={m.carbG} unit="г" color="var(--color-carb)" />
        <MacroMini label="жиры" value={m.fatG} unit="г" color="var(--color-fat)" />
      </div>

      {lowConf && (
        <div className="mt-2 text-[12px] font-medium text-warn">
          ИИ не уверен в порции — поправь ползунком
        </div>
      )}

      <div className="mt-3.5 space-y-3">
        <div className="flex gap-1.5">
          {MULTIPLIERS.map((x) => (
            <button
              key={x.label}
              onClick={() => onGrams(snap(base * x.f))}
              className={cn(
                "flex-1 rounded-full py-1.5 text-[13px] font-semibold transition active:scale-95",
                activeF === x.f ? "bg-accent text-on-accent" : "bg-surface-2 text-muted",
              )}
            >
              {x.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Slider min={5} max={max} step={5} value={draft.grams} onChange={onGrams} />
          <div className="w-[54px] shrink-0 text-right text-[15px] font-bold tabular-nums">
            {draft.grams}
            <span className="text-[12px] font-normal text-muted"> г</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MacroMini({
  label,
  value,
  unit,
  color,
  strong,
}: {
  label: string;
  value: number;
  unit?: string;
  color?: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl bg-surface-2 px-1.5 py-2 text-center">
      <div
        className={cn("tabular-nums", strong ? "text-[17px] font-extrabold" : "text-[15px] font-bold")}
        style={color ? { color } : undefined}
      >
        {value}
        {unit && <span className="text-[10px] font-normal text-muted">{unit}</span>}
      </div>
      <div className="mt-0.5 text-[10px] text-muted">{label}</div>
    </div>
  );
}
