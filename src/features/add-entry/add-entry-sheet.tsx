"use client";

import { useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button, SegmentedControl, Sheet, Slider, Tag, TextInput } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { FoodThumb } from "@/components/food-thumb";
import { toast } from "@/components/toast";
import type { IdentifiedItem } from "@/lib/ai/food";
import { db } from "@/lib/db/db";
import { getRecentFoods, toggleFavorite } from "@/lib/db/repo";
import type { FoodItem, Meal } from "@/lib/db/types";
import type { ResolvedFood } from "@/lib/food-data/types";
import { cn } from "@/lib/utils";
import { BarcodeScanner } from "./barcode-scanner";
import { commitDrafts, draftMacros } from "./commit";
import { draftFromFood, draftFromResolved, resolveIdentified } from "./resolve";
import type { DraftItem } from "./types";

type Mode = "photo" | "voice" | "text" | "search" | "barcode";

const MEALS: { key: Meal; label: string }[] = [
  { key: "breakfast", label: "Завтрак" },
  { key: "lunch", label: "Обед" },
  { key: "dinner", label: "Ужин" },
  { key: "snack", label: "Перекус" },
];

const MODES: { key: Mode; label: string; icon: IconName }[] = [
  { key: "photo", label: "Фото", icon: "camera" },
  { key: "voice", label: "Голос", icon: "mic" },
  { key: "text", label: "Текст", icon: "text" },
  { key: "search", label: "Поиск", icon: "search" },
  { key: "barcode", label: "Штрихкод", icon: "barcode" },
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

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Не удалось прочитать файл"));
    r.readAsDataURL(file);
  });
}

/** Downscale a data URL to a small square-ish JPEG thumbnail for storage. */
function makeThumb(dataUrl: string, max = 160): Promise<string | undefined> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(undefined);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      } catch {
        resolve(undefined);
      }
    };
    img.onerror = () => resolve(undefined);
    img.src = dataUrl;
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

export function AddEntrySheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [meal, setMeal] = useState<Meal>(defaultMeal);
  const [mode, setMode] = useState<Mode>("photo");
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

  async function addIdentified(items: IdentifiedItem[], imageUrl?: string) {
    if (!items.length) {
      setError("Не удалось распознать еду — попробуй ещё раз или введи вручную");
      return;
    }
    const resolved = await Promise.all(items.map(resolveIdentified));
    const withImg = imageUrl ? resolved.map((d) => ({ ...d, imageUrl })) : resolved;
    setDrafts((prev) => [...prev, ...withImg]);
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
      const thumb = await makeThumb(image, 160);
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, model: settings?.aiVisionModel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка распознавания");
      await addIdentified(data.items ?? [], thumb);
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

  const hasDrafts = drafts.length > 0;

  return (
    <Sheet open={open} onClose={handleClose} title="Добавить еду">
      {/* meal selector */}
      <div className="mb-4">
        <SegmentedControl
          options={MEALS.map((m) => ({ value: m.key, label: m.label }))}
          value={meal}
          onChange={(v) => setMeal(v)}
        />
      </div>

      {/* method tiles: 3 + 2 */}
      <div className="mb-3 grid grid-cols-3 gap-2.5">
        {MODES.slice(0, 3).map((m) => (
          <MethodTile
            key={m.key}
            icon={m.icon}
            label={m.label}
            active={mode === m.key}
            onClick={() => setMode(m.key)}
          />
        ))}
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2.5">
        {MODES.slice(3).map((m) => (
          <MethodTile
            key={m.key}
            icon={m.icon}
            label={m.label}
            active={mode === m.key}
            onClick={() => setMode(m.key)}
          />
        ))}
      </div>

      {/* active method input */}
      <div className="mb-4">
        {mode === "search" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <TextInput
                value={query}
                onChange={setQuery}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                placeholder="Найти продукт в базе"
              />
              <Button variant="secondary" className="shrink-0 px-4" onClick={doSearch} disabled={searching || !query.trim()}>
                Найти
              </Button>
            </div>
            {results.length > 0 && (
              <div className="space-y-1.5">
                {results.map((f, i) => (
                  <FoodResultRow
                    key={`${f.sourceId}-${i}`}
                    name={f.name}
                    kcal100={f.per100g.kcal}
                    imageUrl={f.imageUrl}
                    onAdd={() => addResolved(f)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {mode === "photo" && (
          <>
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
            <Button className="w-full" disabled={!!busy} onClick={() => fileRef.current?.click()}>
              <Icon name="camera" size={18} /> Сфотографировать еду
            </Button>
          </>
        )}

        {mode === "voice" && (
          <div className="flex flex-col items-center gap-3 py-2">
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={!!busy}
              className={cn(
                "grid size-20 place-items-center rounded-full transition",
                recording ? "animate-pulse bg-danger/15 text-danger" : "bg-accent-soft text-accent-hover",
              )}
            >
              <Icon name="mic" size={30} />
            </button>
            <p className="text-[14px] text-muted">
              {recording ? "Идёт запись… нажми, чтобы остановить" : "Нажми и наговори, что съел"}
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
              className="w-full rounded-[14px] bg-surface-2 px-4 py-3 text-[15px] outline-none placeholder:text-muted focus:ring-2 focus:ring-accent/40"
            />
            <Button className="w-full" disabled={!!busy || !text.trim()} onClick={handleText}>
              Распознать
            </Button>
          </div>
        )}

        {mode === "barcode" && <BarcodeScanner onDetected={handleBarcode} />}
      </div>

      {busy && (
        <div className="mb-3 flex items-center justify-center gap-2 text-center text-[14px] font-medium text-accent-hover">
          <span className="size-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
          {busy}
        </div>
      )}
      {error && (
        <p className="mb-3 rounded-[14px] bg-danger/10 px-3 py-2.5 text-center text-[14px] text-danger">
          {error}
        </p>
      )}

      {/* recent / favorites — only before drafts exist */}
      {!hasDrafts && (recent.length > 0 || favorites.length > 0) && (
        <div className="space-y-3">
          {favorites.length > 0 && (
            <QuickRow title="Избранное" foods={favorites} onAdd={addFood} />
          )}
          {recent.length > 0 && (
            <QuickRow title="Недавнее" foods={recent} onAdd={addFood} />
          )}
        </div>
      )}

      {/* drafts (AI scan result) */}
      {hasDrafts && (
        <div className="space-y-2.5">
          {drafts.map((d) => (
            <DraftCard
              key={d.key}
              draft={d}
              meal={mealLabel(meal)}
              onGrams={(g) => patchDraft(d.key, { grams: g })}
              onRename={(name) => patchDraft(d.key, { name })}
              onRemove={() => removeDraft(d.key)}
            />
          ))}

          <div
            className="sticky bottom-0 -mx-6 flex items-center gap-4 border-t border-border bg-surface px-6 pb-1 pt-3"
          >
            <div className="text-[22px] font-extrabold tabular-nums">
              {total.kcal} <span className="text-[13px] font-normal text-muted">ккал</span>
            </div>
            <Button className="flex-1" disabled={!!busy} onClick={commit}>
              Добавить {drafts.length} {plural(drafts.length)}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function MethodTile({
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
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-[16px] py-5 transition active:scale-[.98]",
        active
          ? "bg-accent-soft text-accent-hover shadow-[inset_0_0_0_1.5px_var(--color-accent)]"
          : "bg-surface text-fg shadow-card",
      )}
    >
      <Icon name={icon} size={24} />
      <span className="text-[13px] font-semibold">{label}</span>
    </button>
  );
}

function FoodResultRow({
  name,
  kcal100,
  imageUrl,
  onAdd,
}: {
  name: string;
  kcal100: number;
  imageUrl?: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] bg-surface-2 px-3 py-2.5">
      <FoodThumb imageUrl={imageUrl} name={name} size={40} className="rounded-[10px]" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{name}</div>
        <div className="text-[12px] text-muted">{kcal100} ккал / 100 г</div>
      </div>
      <button
        onClick={onAdd}
        aria-label="Добавить"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-white transition active:scale-90"
      >
        <Icon name="plus" size={16} strokeWidth={2.4} />
      </button>
    </div>
  );
}

function QuickRow({
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
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[1.5px] text-muted">
        {title}
      </div>
      <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1">
        {foods.map((f) => (
          <button
            key={f.id}
            onClick={() => onAdd(f)}
            className="flex w-[190px] shrink-0 items-center gap-2.5 rounded-[14px] bg-surface p-2.5 text-left shadow-card"
          >
            <FoodThumb imageUrl={f.imageUrl} name={f.name} size={40} className="rounded-[10px]" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">{f.name}</div>
              <div className="text-[11px] text-muted">{f.per100g.kcal} ккал</div>
            </div>
            <div className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-hover">
              <Icon name="plus" size={13} strokeWidth={2.6} />
            </div>
          </button>
        ))}
      </div>
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
  meal,
  onGrams,
  onRename,
  onRemove,
}: {
  draft: DraftItem;
  meal: string;
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
    <div className="relative rounded-2xl bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <FoodThumb imageUrl={draft.imageUrl} name={draft.name} size={52} />
        <div className="min-w-0 flex-1 pr-7">
          <input
            value={draft.name}
            onChange={(e) => onRename(e.target.value)}
            className="w-full bg-transparent text-[15px] font-bold outline-none"
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Tag tone="sage">{meal}</Tag>
            {draft.source === "estimate" && <Tag tone="neutral">Оценка ИИ</Tag>}
            {draft.source === "off" && <Tag tone="neutral">Open Food Facts</Tag>}
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

      {/* reactive macros */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        <MacroMini label="ккал" value={m.kcal} strong />
        <MacroMini label="белки" value={m.proteinG} unit="г" color="var(--color-protein)" />
        <MacroMini label="углев" value={m.carbG} unit="г" color="var(--color-carb)" />
        <MacroMini label="жиры" value={m.fatG} unit="г" color="var(--color-fat)" />
      </div>

      {lowConf && (
        <div className="mt-2 text-[12px] font-medium text-[#C8871F]">
          ИИ не уверен в порции — поправь ползунком
        </div>
      )}

      {/* portion control */}
      <div className="mt-3.5 space-y-3">
        <div className="flex gap-1.5">
          {MULTIPLIERS.map((x) => (
            <button
              key={x.label}
              onClick={() => onGrams(snap(base * x.f))}
              className={cn(
                "flex-1 rounded-full py-1.5 text-[13px] font-semibold transition active:scale-95",
                activeF === x.f ? "bg-accent text-white" : "bg-surface-2 text-muted",
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
