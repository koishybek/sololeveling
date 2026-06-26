# Spec — «Олжас E-Rank»: Calorie Tracker PWA (Phase 1)

- **Date:** 2026-06-24
- **Status:** Approved (direction), building Phase 1
- **Research basis:** [docs/research/2026-06-24-calai-clone-research.md](../../research/2026-06-24-calai-clone-research.md)

## 1. What we're building

A faithful **Cal AI / Calzen clone** as an installable, offline-first **PWA**, for personal use (Olzhas losing weight). Phase 2 later layers a **Solo-Leveling RPG** (E→S ranks, STR/INT/WIL stats, daily quests, penalties) on top of the *same data*. Phase 1 must stand alone as a great calorie tracker.

**Non-goals (Phase 1):** paywall/subscriptions (build funnel config-driven, but free for personal use), social/leaderboards, wearable sync, cloud sync (local-first now; schema kept migration-ready for Supabase later).

## 2. The one rule that drives the architecture

**Identification ≠ nutrition numbers.** Vision/voice/text models *name* food and estimate grams; **actual macros come from a real nutrition DB (USDA)**. We store `food_id + grams + dbSource` per entry, never a model-emitted calorie scalar. (Nutrition5K benchmark: VLMs name food well but mis-estimate calories badly — up to −136% protein error even with correct ingredients.) Fallback: if no DB match, the model may estimate macros, **flagged as an estimate**.

## 3. Stack (locked)

| Concern | Choice |
|---|---|
| Framework | **Next.js (App Router) + TypeScript** |
| Styling/UI | **Tailwind CSS + shadcn/ui**, dark theme (Solo-Leveling-ready) |
| Local data | **Dexie / IndexedDB** (offline-first, no user backend) |
| Server (proxy only) | Next.js Route Handlers — hide keys, avoid CORS |
| AI provider | **OpenAI** (primary, used everywhere) |
| Vision | `gpt-4o` (structured output) |
| Voice | `whisper-1` / `gpt-4o-transcribe` |
| Text/NLP parse | `gpt-4o-mini` |
| Nutrition data | USDA FoodData Central (live, free key; cached in Dexie) |
| Barcode data | Open Food Facts (live per-scan, no key) |
| Barcode scan (browser) | **Quagga2** + custom viewfinder |
| Camera | `getUserMedia` + `<input capture>` fallback |
| Voice capture | `MediaRecorder` |
| Charts | SVG ring (calories) + Recharts (trends) |
| PWA | `next-pwa` / Serwist (manifest + service worker) |

**No USDA mirror** — premature for single-user volume; cache resolved foods in Dexie.

## 4. AI layer (`src/lib/ai/`)

Single server-only module, one interface, swappable:
- `identifyFoodFromImage(image) → { items: [{ name, grams, cookingMethod, confidence }] }` (gpt-4o, JSON schema response)
- `transcribeAudio(audio) → text` (whisper-1)
- `parseFoodFromText(text) → { items: [...] }` (gpt-4o-mini)
- `estimateMacros(name, grams) → macros` (gpt-4o-mini, fallback only, flagged `isEstimate: true`)

Route handlers: `POST /api/scan` (image), `POST /api/transcribe` (audio), `POST /api/parse-food` (text), `GET /api/food/search?q=`, `GET /api/food/barcode?code=`.

**Latency rule:** the 5-second log is sacred. Optimistic UI + skeleton macro card the instant input is captured.

## 5. Data model (Dexie tables)

- `profile` — sex, age, heightCm, weightKg, targetWeightKg, activityLevel, goal, paceKcal
- `dailyGoals` — date, kcal, proteinG, carbG, fatG (recomputable)
- `foods` — id, name, source (`usda|off|estimate`), sourceId, per-100g macros (cache)
- `logEntries` — id, date, meal, foodId, grams, computed macros, **`correctionMade` (bool)**, **`isWholeFood` (bool)**, **`dbSource`**, createdAt
- `weights` — date, weightKg
- `settings` — units, theme, AI model prefs
- `mealPhotos` — id, blob, logEntryId (optional, for progress photos / re-review)

The bold fields exist now purely to feed Phase 2 stat math at zero extra cost.

## 6. Screens (Phase 1)

1. **Onboarding quiz** — config-driven step machine (~15 steps, one input/screen, progress bar): goal → sex/age/height/weight/target → activity → **live pace slider redrawing projected goal date** → "generating your plan" loader → plan reveal (kcal + macros).
2. **Home / dashboard** — calories-remaining **ring** + macro bars + meal sections + **one-tap relog** + big capture button (camera/mic/barcode/text).
3. **Add entry** — 4 modes: photo · voice · barcode · text/search → **editable result card** (ingredient chips, portion sliders, cooking-method chip raw/sauté/fried = +0/+60/+120 kcal, "add hidden oil/sauce").
4. **Progress** — weight + trend chart, history, progress photos.

## 7. Calorie math (`src/lib/nutrition/`)

Mifflin-St Jeor BMR → ×activity factor (1.2–1.9) → TDEE → ± pace deficit/surplus. Projection: `weekly_rate_kg = deficit_kcal/day × 7 / 7700`. Macro defaults 30P/40C/30F, overridable. All client-side for instant slider; persisted on plan creation. Pure functions → unit-tested (TDD).

## 8. Phase 2 hooks (design now, build later)

STR = protein/macro adherence · WIL = logging streaks/consistency · INT = AI-correction events + whole-food ratio. Ranks E→D→C→B→A→S from cumulative XP/stat composite. Daily quests + penalties (stat decay on missed days). Weekly EWMA target recalc surfaced as a "recalibration / level-up" event. All computed from existing `logEntries`/`weights` — no new data capture.

## 9. MVP build checklist (Phase 1)

- [ ] Scaffold Next.js + TS + Tailwind + shadcn + PWA shell
- [ ] Dexie schema + repository layer + seed
- [ ] Nutrition math (pure, tested)
- [ ] Onboarding quiz + projection slider + plan reveal
- [ ] AI layer + route handlers (scan / transcribe / parse-food)
- [ ] USDA search + Open Food Facts barcode proxies + Dexie cache
- [ ] Add-entry: photo, voice, text, barcode → editable result card
- [ ] Dashboard: ring + macro bars + meal sections + relog
- [ ] Progress: weight log + trend chart
- [ ] PWA manifest, icons, service worker, installability + offline

## 10. Open decisions (deferred, non-blocking)

- Photo accuracy ceiling (~15–25% on plated meals; no LiDAR in browser) — set honest "estimate range" expectations.
- Supabase cloud sync — schema is migration-ready; add when multi-device needed.
- Vision model cost — `gpt-4o` vs `gpt-4o-mini`; abstracted behind one call to switch.
