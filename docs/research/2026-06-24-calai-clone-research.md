<!-- Auto-generated from deep-research workflow wf_31daf5c1-063 on 2026-06-24. 7/8 dossiers; Calzen treated as a Cal AI-pattern clone. -->

# Research Report: Building a Cal AI-Style Calorie Tracker PWA with a Solo-Leveling RPG Layer

---

## 1. Executive Summary — What to Build, in Priority Order

The opportunity is real and the playbook is documented. Cal AI went from $28K MRR to $1M MRR in six months and ~$40M trailing-12-month revenue on one wedge: **kill the friction of manual food logging by replacing it with a photo**. It was then acquired by the very incumbent it disrupted (MyFitnessPal). The entire category over-paywalls fast, accurate logging (MyFitnessPal infamously moved *barcode scanning* behind a $79.99/yr wall in 2024) and under-delivers on motivation. Those are two open wedges. Your differentiator — a Solo-Leveling RPG progression layer — attacks the second one, because Cal AI is explicitly criticized as "isolating" with no real social or game loop.

**Build in this strict order. Do not reorder — each phase de-risks the next.**

1. **Phase 0 — The 5-second log (the only thing that matters first).** Browser camera → backend vision-LLM call → structured JSON `{items:[{name, grams, kcal, protein, carb, fat}]}` → editable result card → logged. If this isn't fast and trustworthy, nothing else counts. Protect this latency above all.
2. **Phase 0.5 — Reliability anchors around the fuzzy scan.** Barcode scan (~100% accurate, cheap) + manual/text search. These are your trust anchors and your fallback when the photo is wrong.
3. **Phase 1 — The conversion funnel.** A ~20-28 step quiz → live goal-projection slider → "generating your plan" loader → personalized calorie+macro reveal → (for personal use, skip the paywall; but build the funnel config-driven so a paywall can drop in later).
4. **Phase 1.5 — The dashboard + history.** Hero calories-remaining ring, macro bars, meal sections, one-tap re-log, weight trend, progress charts.
5. **Phase 2 — The RPG layer (your moat).** Re-skin the *same data* you're already capturing into STR/INT/WIL stats, E→S ranks, daily quests, and penalties. This is additive and must never slow the 5-second log.

**The single most important architectural decision:** separate *identification* from *nutrition numbers*. Use the vision model to name food + guess portion; look up the actual macros in a real nutrition DB. The Nutrition5K benchmark is unambiguous that VLMs cannot be trusted to do calorie arithmetic — even when handed correct ingredients (DeepSeek-VL2 swung -136% on protein error with ground-truth ingredients). **Store `food_id + grams + db_source`, never a model-emitted calorie scalar.**

**Stack recommendation (for a solo Next.js/React dev):** Next.js App Router (PWA) + Supabase (Postgres + Auth + Storage) + a self-hosted USDA FoodData Central mirror + Open Food Facts (live, per-scan) for barcodes + GPT-4o-mini *or* Gemini 2.5 Flash-Lite as the food *identifier* (~$0.0001-0.0003/photo). This is ~100x cheaper per scan than specialized food APIs and lets you offer a generous free tier — exactly right for personal-use-first.

---

## 2. Cal AI / Calzen Feature & UX Teardown (Screen-by-Screen)

> Note on Calzen: the dossiers contain deep primary data on Cal AI but only passing reference to "Calzen." Calzen is a near-identical Cal AI clone in the same wedge (photo → macros, quiz onboarding, trial-led paywall); where Calzen-specific data is unavailable I mark it and treat Cal AI as the canonical reference design, which is appropriate since you are cloning that exact pattern.

### 2.1 Onboarding Quiz (~28 steps, ~2 min 15s)
This is the conversion engine, not a formality. The sequence:

1. **Intro/demo video** — sets the value expectation ("point camera, get calories").
2. **Goal selection** — lose / maintain / gain (all leading apps start here).
3. **Body stats**, one question per screen — sex, age, height, current weight, target weight. *One input per screen* keeps momentum and makes a long flow feel fast via a top progress bar.
4. **Activity level** — maps to the TDEE multiplier (Sedentary 1.2 → Extremely active 1.9).
5. **Lifestyle/psychographics** — past challenges, eating habits, dietary preference. These answers also feed *dynamic pricing*.
6. **Weight-loss-SPEED selector (~01:05)** — the emotional peak. A slider that *instantly redraws the projected goal-date* as you drag. This sells the outcome before any payment ask.
7. **Mid-flow App Store review prompt** — fired at the sentiment peak, *before* the payment friction.
8. **"Generating your plan" loader** — manufactured effort, makes the result feel earned and bespoke.
9. **Plan reveal** — daily calorie target + macro split (computed via Mifflin-St Jeor). The payoff.
10. **Paywall (~03:25)** — appears immediately after the reveal, so it reads as "unlock the plan I just built you." 3-day trial, card required up front, defaulting to the annual plan.

**Why 28 steps is a feature, not bloat:** the length manufactures sunk-cost investment. More effort invested predicts higher payment follow-through.

### 2.2 Home / Dashboard
- **Card-based, mobile-first.** Primary card = **calories + 3 macros** (protein/carbs/fat) as data viz.
- **Swipe-to-reveal** hides secondary metrics (fiber, sodium) — progressive disclosure keeps the core view calm.
- **Always-visible hero number** (calories remaining), borrowing Yazio's "countdown" framing.
- **Large camera CTA** as the primary action — the photo scan is the reason users are here.

### 2.3 Food Log / Add-Entry Surface
Four logging modes surfaced as distinct, seamless entry points from one button:
- **AI photo** (the wedge)
- **Barcode** (the trust anchor)
- **Nutrition-label OCR** (when no barcode)
- **Voice/text** ("describe what you ate")

Meal categories with **one-tap relog** for repeat meals. Custom foods + saved recipes. Rollover calories (carry unused calories to the next day).

### 2.4 AI Photo Scan (the core)
A 4-step server-side pipeline (3-5s):
1. **Object detection** segments each food item.
2. **Portion/volume estimation** using visual depth cues + plate size as a scale reference.
3. **Nutrition DB lookup** for calories/protein/carb/fat/fiber/sodium/sugar.
4. **User-review screen with adjustment sliders** — this correction loop is *core, not optional*.

**Accuracy bands (independently tested, and consistent with the peer-reviewed literature):**
- ~10-15% off for simple single items
- 15-25% for standard plated meals
- 25-40% for complex mixed dishes (curries/soups)
- ~100% for barcoded packaged food

**The unfixable limitation:** invisible ingredients. ~1 tbsp olive oil = ~120 hidden calories; ~2 tbsp butter = 200+. All undetectable, so the AI *systematically under-counts*. This is why the correction loop is load-bearing.

### 2.5 Progress
- Progress charts + full history; weight tracking.
- **Progress Photos** (visual body-change log).
- **Milestones** tab styled as a trophy room with animated badges for streaks/water/consistent logging. *This is the bland gamification your RPG layer replaces.*
- Public Groups for social accountability (Cal AI's thin attempt at social — another opening for you).

---

## 3. Feature Matrix

| Feature | **Cal AI** | **Calzen** | **MyFitnessPal** | **Yazio** | **MacroFactor** | **Lose It!** |
|---|---|---|---|---|---|---|
| AI photo scan | ✅ Core (paid) | ✅ Core | ✅ static, *non-editable* | ✅ Pro (late '25) | ✅ **editable ingredients** | ✅ "Snap It" (2025) |
| Editable AI result | ✅ sliders | ✅ | ❌ static estimate | partial | ✅ best-in-class | partial |
| Barcode scan | ✅ (paid) | ✅ | ⚠️ **Premium-only since '24** | ⚠️ Pro | ✅ | ⚠️ restricted for new free |
| Voice/text logging | ✅ | ? | ✅ voice only | ❌ | ✅ voice **or** text | ✅ "Say It" |
| Nutrition-label OCR | ✅ | ? | ❌ | ❌ | ✅ label scan | ❌ |
| Nutrients tracked | macros+fiber/Na/sugar | macros | **only 14** | basic | **54** | macros |
| Food DB size | ~1M | — | **20M** crowd | ~4M barcode | ~1.36M *verified* | 47M+ |
| Adaptive weekly target | ❌ static | ❌ | ❌ never adjusts | ❌ | ✅ **EWMA, ~3x acc.** | weekly cycling (Premium) |
| Intermittent fasting | ❌ | ❌ | ⚠️ | ✅ **category leader** | ❌ | ✅ (Premium) |
| Gamification | trophy room | — | streaks/social | fox timer | ❌ | ✅ **Challenges** |
| Health score | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (Lifesum: ✅) |
| Wearable sync | Apple/Google/Fitbit | ? | ✅ | ✅ 4 platforms | ✅ | ✅ |
| Free tier usable? | ❌ thin (no photo) | ❌ thin | ⚠️ ad-cluttered, no barcode | ⚠️ trial-grade | ❌ **none** | ✅ manual search free |
| Annual price | $29.99 (disc. $19.99) | ~similar | **$79.99** | $23.90-47.90 | $71.99 | **$39.99** (+$299 lifetime) |
| Monthly price | $9.99-14.99 | — | $19.99 | ~$4-8 | $11.99 | — |
| Trial | 3-day, card up front | 3-day | 7-day Premium+ | ❌ none | ❌ none | free try-before-buy |

**Reading the matrix for your build:** MyFitnessPal is the cautionary tale (paywalled the basics, static AI, only 14 nutrients). MacroFactor is the UX/adaptivity benchmark (editable AI, adaptive targets, ~50% fewer taps). Lose It! is the value/pricing leader at $39.99/yr. Your winning position: **keep photo + barcode free forever** (the thing MFP charges for), ship **editable AI** (the thing MFP lacks), and **monetize the RPG layer** that none of them have.

---

## 4. AI Food Recognition: Recommended Approach for a Solo Dev

### The architecture rule that overrides everything
**Identification and nutrition numbers are SEPARATE layers.** The peer-reviewed Nutrition5K benchmark (3,466 samples, 285 categories) found general VLMs are good at *naming* ingredients (Gemini 2.5 Flash led at 0.63 F1, Llama 3.2-Vision 90B 0.62, Grok-2 0.60) but "exhibited poor performance in estimating nutritional content" — *even when handed ground-truth ingredients*. Adding ingredient labels sometimes made nutrient estimation *worse*. The conclusion: VLMs "lack a robust mechanism for integrating ingredient identity, portion size, and nutritional knowledge."

→ **Never ask the model for the calorie math. Use it to name food + estimate grams, then look up macros in a DB.**

### Accuracy reality (and the PWA ceiling)
- Identification is largely solved: 85-95% top-1 on common foods, 60-75% long-tail/regional.
- **Portion estimation is the dominant error source:** 2D-photo-only = 15-25% median error; depth-aware = 8-12%; LiDAR ~8%.
- **PWA constraint: browsers cannot read iPhone LiDAR.** You are locked near the 2D band (~15-25% on plated meals). Do not promise native-app accuracy. Compensate with a plate-size reference heuristic, an honest correction UX, and the barcode anchor.

### Three routes, costed

| Route | Per-photo cost | Returns calories? | Best for |
|---|---|---|---|
| **A. General VLM as identifier + free DB** | **~$0.0001-0.0003** | ❌ (you map to DB) | **Your MVP & scale path** |
| B. Specialized food API (Passio/LogMeal/FatSecret) | $0.0075-0.0125 (Passio) | ✅ directly | "Accuracy boost" paid tier later |
| C. Hybrid (A + B as upsell) | mixed | partial | Post-revenue |

- **Passio Nutrition-AI:** $2.50/M tokens, ~3-5k tokens/image = $0.0075-0.0125/photo. On-device SDKs + REST. **No free tier** → don't start here.
- **LogMeal:** 30-day / 200-query free trial (good for an MVP spike), monthly tiers gated.
- **FatSecret:** Image Recognition + NLP add-ons, billed in 25,000-input tiers (50% off startups/nonprofits). **"Premier Free"** gives qualifying startups (<$1M revenue) US data + premium features free — cheapest all-in-one if you qualify.
- **General VLMs:** GPT-4o-mini (~$0.15/$0.60 per M in/out) and Gemini 2.5 Flash-Lite (~$0.10/$0.40) put a single food photo (~1000-1500 image tokens + short prompt + short JSON out) at **~$0.0001-0.0003** — two orders of magnitude cheaper. Claude Haiku 4.5 ($1/$5 per MTok) is a strong identifier but pricier for high-volume classification.

### Concrete recommendation
**Ship Route A.** Use **GPT-4o-mini or Gemini 2.5 Flash-Lite as the identifier only**, with a tight structured-JSON prompt returning `{items:[{name, grams, cooking_method, confidence}]}`. Resolve `name` against your self-hosted USDA mirror for the actual macros. This gives a generous free tier on near-zero cost. Keep **LogMeal's free trial** in your back pocket for a one-week validation spike if you want to compare, and keep **Passio/FatSecret Image Recognition** as a future paid "accuracy boost" tier.

**Two cheap mitigations that directly attack Cal AI's #1 complaint (the hidden-oil underestimate):**
1. A one-tap **cooking-method chip** on the result card (raw / sautéed / fried) that applies a small fixed oil adjustment (+0 / +60 / +120 kcal).
2. An **"add hidden oil/sauce" quick-add** in the correction loop.

**Show estimates as ranges or with a confidence cue, never false-precision single numbers.** Always offer barcode (the ~100% anchor) and an editable result card. The corrections users make are your future heuristic/training data — and they double as your RPG "INT XP" source.

---

## 5. Nutrition Data & Barcode

### Tiered fallback (do not pick one vendor)
1. **Generic/whole foods + text logging → self-hosted USDA FoodData Central mirror.** CC0 1.0 public domain (attribution requested, not required), ~380k+ foods (Foundation/SR Legacy/Survey/Branded), free data.gov key. **CC0 means you can legally mirror the entire dataset server-side** — do that to eliminate the 1,000 req/hr/IP rate-limit risk and get best generic-food accuracy. Weakness: no barcode endpoint.
2. **Barcode scans → Open Food Facts, live per-scan.** ~4M products (2025), 150 countries, no auth: `GET https://world.openfoodfacts.org/api/v2/product/{barcode}`. **Legal trap: ODbL share-alike** on the DB. Using it for live per-scan lookups (their hard rule: "1 API call = 1 real scan by a user") is fine; **building and shipping a proprietary derived DB from it is not.** Send a descriptive User-Agent; for any bulk needs use the nightly dumps, never the API.
3. **Barcode fallback when OFF misses → FatSecret Basic** (free, 5,000 calls/day, US-only, includes barcode + autocomplete, attribution required). If global barcode coverage becomes a growth blocker, graduate to **FatSecret Premier** (90%+ global UPC/EAN, ~1.9M verified items, no attribution, no share-alike) — and you likely qualify for **Premier Free** (unlimited, free, startups under $1M revenue) which is the single best near-term deal for global coverage.

### Skip at MVP
- **Nutritionix** — no usable free tier (enterprise ~$1,850/mo). Re-implement its "I ate 2 eggs and toast" NLP UX yourself by sending free text to your LLM and mapping to the USDA mirror — same UX, zero per-call cost.
- **Edamam** — free tier needs a credit card, high friction. Revisit only if/when you add recipes + diet/health-label filtering (its 40+ diets, 200+ health labels, 2M recipes are genuinely strong there).

### Barcode in the browser
- **Ship Quagga2** for 1D EAN/UPC (covers most packaged food): pure-JS, no native deps, actively maintained. You must build the viewfinder/reticle UI yourself, and it lacks UPC-E and GS1 DataBar.
- **Avoid html5-qrcode for production** — faster to prototype (ready UI, GS1 DataBar) but **unmaintained since April 2023** (ZXing-js base also in maintenance). Use only for a throwaway prototype.
- **Budget device QA:** Quagga2 has `NotReadableError` on some Samsungs post-OS-update; test specifically on **iOS standalone PWA mode** (the weakest link for camera).
- Keep a **commercial SDK (Scanbot / Strich)** as a documented paid escape hatch if decode reliability blocks usage.

### Compliance hygiene (cheap, from day one)
Store the **data source per food-log entry** (`usda_fdc_id` / `off_barcode` / `fatsecret_id`), surface required attributions (USDA requested; OFF + FatSecret Basic required), and send a descriptive User-Agent to OFF. This keeps you audit-clean and lets you swap sources without reworking the schema.

---

## 6. Recommended PWA Tech Stack (for a solo Next.js/React dev)

> The dossier section for this topic was a placeholder ("test"), with one usable directive: **"Pick Next.js App Router as the primary stack."** The recommendations below are the opinionated build that follows from that plus the rest of the dossiers.

| Concern | Pick | Rationale |
|---|---|---|
| **Framework** | **Next.js (App Router)** | Per dossier directive; you know it; API routes give you the server-side scan endpoint + Stripe webhooks in one repo; great PWA support. |
| **Hosting** | **Vercel** (app) + **Supabase** (data) | Zero-ops for a solo dev. Vercel functions run your `/api/scan` glue and LLM calls. |
| **DB + Auth + Storage** | **Supabase (Postgres + Auth + Storage)** | One service for relational food-log data, auth, and meal-photo storage. Postgres lets you mirror USDA and run the RPG stat computations server-side cheaply. |
| **PWA / Service Worker** | **`next-pwa`** (or Serwist, its maintained successor) | Installability + offline caching of the app shell and the USDA lookup. |
| **Offline log queue** | **IndexedDB via `idb` or Dexie.js** | Camera/scan flows must work in stores with weak signal; queue logs locally and sync. |
| **Camera capture** | **`getUserMedia` + `<input type="file" capture="environment">` fallback** | Works in every mobile browser; the file-capture fallback is the reliability net for iOS PWA quirks. |
| **Barcode** | **Quagga2** | See §5. |
| **Charts** | **Recharts** (simple) or **visx** (custom RPG visuals) | Recharts for macro bars/weight trend; visx if you want bespoke rank/XP rings. For the calories-remaining ring, a simple SVG `circle` with `stroke-dasharray` is enough — no library. |
| **UI kit** | **Tailwind CSS + shadcn/ui** | Fast, mobile-first, easy to theme into a dark "Solo Leveling" aesthetic later. |
| **Push notifications** | **Web Push API + VAPID** (e.g. `web-push`) | For daily-quest reminders and "penalty incoming" nudges. ⚠️ **iOS only supports web push for *installed* PWAs (iOS 16.4+)** — gate push prompts behind an "Add to Home Screen" step. |
| **Payments (later)** | **Stripe** (Checkout + Customer Portal) | A PWA isn't bound by App Store IAP rules, so you own the full web paywall and can do **server-side variable pricing keyed off quiz answers** — exactly Cal AI's lever via Superwall+Stripe. |
| **Vision LLM** | **GPT-4o-mini or Gemini 2.5 Flash-Lite** | See §4. |
| **Analytics/events** | **PostHog** (self-host or cloud) | Funnel + experiment flags in one tool; instrument tap-counts and the paywall funnel from launch. |

**Latency tactics (protect the 5-second log):** optimistic UI + a skeleton macro card the instant the photo is taken; stream the LLM JSON if the SDK supports it; cache USDA lookups in Postgres so DB resolution is a single indexed query.

---

## 7. Calorie / Macro Math (ready to implement)

**BMR — Mifflin-St Jeor** (Academy-of-Nutrition default, within ~10% of measured RMR):

```
BMR_male   = (10 × weight_kg) + (6.25 × height_cm) − (5 × age) + 5
BMR_female = (10 × weight_kg) + (6.25 × height_cm) − (5 × age) − 161
```

**TDEE = BMR × activity factor:**

| Activity | Factor |
|---|---|
| Sedentary | 1.2 |
| Lightly active | 1.375 |
| Moderately active | 1.55 |
| Very active | 1.725 |
| Extremely active | 1.9 |

**Calorie goal:**
```
goal_calories = TDEE + adjustment
   lose:     adjustment = −deficit   (e.g. −500 kcal/day ≈ −0.45 kg (1 lb)/week fat loss)
   maintain: adjustment = 0
   gain:     adjustment = +surplus
```

**Goal projection (drives the live slider — the most persuasive screen):**
```
weekly_rate_kg = (deficit_kcal_per_day × 7) / 7700      // 7700 kcal ≈ 1 kg fat
weeks_to_goal  = abs(current_kg − target_kg) / weekly_rate_kg
projected_date = today + weeks_to_goal × 7 days
```
Run all of this **client-side** so the slider redraws the projected date instantly; persist the final plan server-side at account creation.

**Macro split (sensible defaults; let users override):**
```
protein_g = goal_calories × 0.30 / 4
carb_g    = goal_calories × 0.40 / 4
fat_g     = goal_calories × 0.30 / 9
```
A higher-protein default (e.g. 1.6-2.2 g/kg bodyweight) is worth offering, and it maps cleanly to the STR stat (§8).

**Adaptive weekly target (MacroFactor's moat — a feature AND an RPG mechanic):** Each week, compute a weighted moving average (EWMA) of weight trend vs logged intake to back out the user's *true* expenditure, then update the calorie target. Claimed ~3x more accurate than static TDEE. **Make this weekly recalc FEEL like a rank-up / "your stats recalibrated" event** in the RPG layer.

---

## 8. Gamification Layer Design (Solo Leveling)

**Core principle: re-skin the same data you already capture. The RPG layer is a *view* over your food-log + weight events, not a separate system. It must be OPTIONAL and additive — it can never add a tap to the 5-second log.**

### 8.1 Mapping behavior → the three stats

| Stat | Solo Leveling flavor | Derived from | XP event |
|---|---|---|---|
| **STR** (Strength) | physical power | **Protein/macro adherence** | +XP when daily protein target met; bonus for hitting all macros |
| **WIL** (Willpower) | discipline | **Logging consistency / streaks** | +XP per day all meals logged; streak multipliers |
| **INT** (Intelligence) | knowledge | **Correcting AI estimates, hitting micro-goals, learning** | +XP each time the user edits/teaches the AI in the correction loop ("you taught the system, +5 INT"); +XP for fiber/whole-food ratio |

This is elegant because **the correction loop — which you need anyway for trust — doubles as your INT XP source.** Inaccuracy becomes engagement.

### 8.2 Ranks (E → S)
Replace Cal AI's bland "Milestones trophy room" with **E / D / C / B / A / S ranks**, driven by cumulative XP and/or a composite of the three stats. Rank-ups are the big dopamine moments — tie the **weekly adaptive-target recalc** to a rank check so leveling your "expenditure stat" feels earned.

### 8.3 Daily quests
Concrete, derived directly from logging events:
- "Log breakfast" / "Log all 3 meals"
- "Hit your protein target" (STR)
- "Stay under your calorie cap" (WIL)
- "Correct one AI estimate" (INT)
- "Log a whole/unprocessed food" (INT)

### 8.4 Penalties
Mirror Solo Leveling's penalty quests: **stat decay / rank-down for missed days** (missed-log streak break). This is the anti-churn mechanic the pure calorie clones lack — and it's a thematic, A/B-testable paywall hook later ("unlock a **penalty-shield**").

### 8.5 What's proven to retain vs. what's gimmicky

**Proven (build these):**
- **Streaks** — validated across the entire category (Cal AI, MFP, Duolingo-style). WIL is your streak engine.
- **Daily quests / challenges** — Lose It!'s Challenges already validate challenge mechanics *in this exact audience*.
- **Health-as-score** — Lifesum's weekly Life Score (0-150, banded) proves a single recurring banded score motivates this audience. Your rank serves the same role.
- **The weekly "recalibration as level-up" beat** — gives a real, data-driven reason to re-engage weekly.

**Gimmicky / risk (defer or use sparingly):**
- Over-complex skill trees, equipment/inventory systems, and "boss fights" that require their own content pipeline — these are content-treadmills a solo dev can't feed. A "boss-fight challenge" can work as a *premium* monthly event but don't build it for MVP.
- Pure cosmetic badges with no behavior tie — Cal AI's trophy room is exactly the thing you're improving on; don't just re-skin badges, tie every reward to a logging behavior.
- Leaderboards before you have a community — comparison demotivates more than it motivates at low population.

**Schema note (design now, even if Phase 2 is later):** store per log entry `macros + whole-vs-branded flag + barcode/db source + correction_made (bool)`. The RPG engine reads these to compute stats with zero extra API cost, because USDA is mirrored locally.

---

## 9. Monetization & Onboarding Conversion Patterns

**Context: this is personal-use first.** You can skip the paywall entirely for your own use. But the dossiers are rich on this, and you should **build the onboarding/funnel config-driven so a paywall can drop in without a rewrite** — both because patterns inform good UX and because this could become a product.

### The funnel shape (copy verbatim)
Long one-question-per-screen quiz → live projection slider → "generating your plan" loader → personalized plan reveal → **paywall after the reveal** (so it reads as "unlock the plan I just built you"). Cal AI's benchmarks: **87% paywall-presentation, 57% trial-start, 63% checkout-completion, 57% trial-to-paid.** They ran 123 experiments / 424 variants, ~5 live/month, lifting trial-to-paid +31% over 12 months — the edge was *velocity*, not one perfect design.

### The five reusable paywall patterns (Superwall, named)
1. **Anchor & Decoy** — show monthly high so annual looks cheap; badge annual "Most Popular / Best Value" with explicit savings % and per-day/week decomposition.
2. **Value Stack** — verb-led, icon-rich feature list ("Unlock / Access / Get").
3. **Social Proof** — user count + star rating + a testimonial on the paywall.
4. **Soft Commitment** — "No Payment Due Now," visible exact charge date, CTA reads "Start Free Trial" not "Subscribe," "Cancel anytime."
5. **Now-or-Never** — countdown/scarcity, **reserved for exit-intent** (Yazio's spin-the-wheel "win up to 75% off").

### Pricing recommendation (if/when you monetize)
- **Keep photo + barcode FREE** (the exact thing MFP charges for — a switcher magnet). Gate scans with a *daily cap* (controls your per-scan API cost), not logging (engagement).
- **Paid ~$4-5/mo or ~$39.99/yr** to match Lose It! (the value leader) and undercut Cal AI's $14.99/mo anchor. Add a **one-time lifetime tier** as a low-friction wedge.
- **Sell the RPG progression, micronutrient depth, and the "accuracy boost" (specialized-API) tier — never the act of logging.** The RPG layer is a *second* monetization hook and a strong anti-churn mechanism the pure clones lack ("unlock your Hunter rank / advanced quests / penalty-shield").

### FTC hygiene (cheap insurance, since you'd card-gate a trial)
The FTC has scrutinized the quiz → projection-promise → card-gated-trial → auto-charge pattern (Noom, BetterMe, Lasta, Simple; Noom had a 2021 auto-renewal class action). If you ever ship a trial: show the **exact charge date**, send a **pre-charge reminder**, use **"Start Free Trial"** copy, and make **cancellation one tap**.

### Nearly-free conversion/retention gains
- **Referral reward** (Cal AI gave $10/friend).
- **Mid-onboarding review prompt** fired right after the plan-reveal sentiment peak, before any payment ask.

---

## 10. Proposed MVP Scope (buildable checklist)

### Phase 1 — Calorie Clone (validate the wedge)
**Logging core**
- [ ] Browser camera capture (`getUserMedia` + file-capture fallback)
- [ ] `/api/scan` endpoint → vision LLM (GPT-4o-mini/Gemini Flash-Lite) → `{items:[{name, grams, cooking_method, confidence}]}`
- [ ] Resolve item names → self-hosted **USDA mirror** for macros; store `food_id + grams + db_source`
- [ ] **Editable result card** (ingredient chips, portion sliders, cooking-method chip, "add hidden oil/sauce" quick-add) — first-class, not afterthought
- [ ] Confidence/range display (no false precision)
- [ ] **Barcode scan** (Quagga2 + viewfinder UI) → Open Food Facts live, FatSecret Basic fallback
- [ ] Manual/text search ("2 eggs and toast" → LLM → USDA mirror)
- [ ] Offline log queue (IndexedDB) + sync

**Onboarding & plan**
- [ ] Config-driven step-machine quiz (~20-28 steps, one question/screen, progress bar)
- [ ] Live weight-loss-speed slider redrawing projected date (client-side Mifflin-St Jeor + projection math)
- [ ] "Generating your plan" loader → personalized calorie+macro reveal

**Dashboard & history**
- [ ] Calories-remaining hero ring + macro bars; swipe-to-reveal secondary (fiber/Na)
- [ ] Meal sections (B/L/D/snacks); **one-tap relog** of recent/favorite foods
- [ ] Weight tracking + trend chart; full history
- [ ] PWA installability + service worker (next-pwa/Serwist)

**Instrumentation**
- [ ] PostHog events: scan latency, tap-count per flow, (later) funnel rates
- [ ] Data-source + `correction_made` stored per entry (forward-compat for RPG)

### Phase 2 — Gamification (the moat)
- [ ] STR/INT/WIL stat engine reading the existing food-log schema (server-side, free)
- [ ] E→S rank system + rank-up animations
- [ ] Daily quests (log meals / hit protein / under cap / correct an estimate / log whole food)
- [ ] Streak engine (WIL) + streak multipliers
- [ ] **Penalty system** (stat decay / rank-down on missed days) + optional penalty-shield
- [ ] **Weekly adaptive-target recalc (EWMA)** surfaced as a "stats recalibrated" rank event
- [ ] Solo-Leveling dark theme reskin of the dashboard + quest strip on the home screen
- [ ] Web Push (VAPID) for quest reminders / penalty warnings (gate behind A2HS on iOS)

### Phase 3 (optional, post-validation) — Monetization & polish
- [ ] Config-driven remote paywall + Stripe Checkout/Portal; server-side variable pricing
- [ ] Exit-intent spin-the-wheel; the five paywall patterns; FTC-clean trial copy
- [ ] "Accuracy boost" tier routing scans through Passio/FatSecret
- [ ] Apple Health / Google Fit / Health Connect sync
- [ ] Referral reward; mid-onboarding review prompt

---

## 11. Open Questions / Decisions the Developer Must Make

1. **Photo accuracy ceiling vs. expectations.** A PWA can't read LiDAR, capping you at ~15-25% on plated meals. Are you OK setting honest "estimate range" expectations, or does accuracy frustration eventually justify a thin native wrapper for depth on Pro devices?
2. **Vision provider lock-in.** GPT-4o-mini vs. Gemini 2.5 Flash-Lite as identifier — Gemini scored highest on ingredient F1 (0.63) in the benchmark and is cheapest; GPT-4o-mini has the larger ecosystem. Pick one but **abstract the call behind one interface** so you can swap.
3. **USDA-mirror food-name matching.** The hidden cost of Route A is building the food-name → USDA-entry matching/glue layer (fuzzy match, synonyms, branded vs. generic). How much effort here vs. paying for a specialized API that returns calories directly? Recommendation: build the matcher; it's a one-time cost and the per-scan savings are 100x.
4. **Open Food Facts licensing.** Confirm you only ever use OFF as **live per-scan lookups** and never persist a derived DB — or commit early to FatSecret Premier Free to sidestep ODbL share-alike entirely.
5. **RPG depth vs. content-treadmill.** How much RPG content (quests, ranks, events) can one developer sustain? Decide which mechanics are *evergreen/derived* (streaks, stats, daily quests — auto-generated from data) vs. *content-hungry* (boss fights, story) and cut the latter from MVP.
6. **Stat formula tuning.** Exact XP weights, decay rates, and rank thresholds need playtesting — easy to make too punishing (churn) or too generous (meaningless). Make them config values, not hardcoded.
7. **Personal-use vs. product.** This is personal-first. Decide up front whether to invest in the config-driven funnel/paywall scaffolding now (cheap if done early, expensive to retrofit) even though you won't charge yourself.
8. **iOS PWA fragility.** Camera + push + installability are all weakest on iOS standalone PWA. How much QA budget, and is a thin Capacitor/native wrapper a fallback if iOS PWA blocks the camera?
9. **Adaptive-target algorithm.** Reproducing MacroFactor's EWMA expenditure model is differentiating but needs validation against your own weight+intake data before you trust it to move targets automatically.

---

## 12. Sources (deduped)

- Cal AI App Store listing — https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616
- Superwall case study (Cal AI paywall experimentation) — https://superwall.com/case-studies/cal-ai
- 5 Paywall Patterns Used By Million-Dollar Apps (Superwall) — https://superwall.com/blog/5-paywall-patterns-used-by-million-dollar-apps
- Cal AI UI Breakdown (Screensdesign) — https://screensdesign.com/showcase/cal-ai-calorie-tracker
- Yazio UI Breakdown (Screensdesign) — https://screensdesign.com/showcase/yazio-calorie-counter-diet
- Yazio Onboarding flow (theAppFuel) — https://theappfuel.com/examples/yazio_onboarding
- Cal AI Review 2026: Is Photo Calorie Counting Accurate? (Aumiqx) — https://aumiqx.com/ai-tools/cal-ai-app-review-nutrition-tracker-2026/
- Cal AI Pricing 2026 (NutriScan) — https://nutriscan.app/blog/posts/cal-ai-pricing-2026-monthly-yearly-premium-abc6e7b26f
- Cal AI pricing 2026 (eesel AI) — https://www.eesel.ai/blog/cal-ai-pricing
- Cal AI TikTok Marketing Playbook (Stormy AI) — https://stormy.ai/blog/cal-ai-tiktok-marketing-playbook-2026
- How Two Teens Built Cal AI (Starter Story) — https://www.starterstory.com/cal-ai-breakdown
- Cal AI teenage CEO (CNBC) — https://www.cnbc.com/2025/09/06/cal-ai-how-a-teenage-ceo-built-a-fast-growing-calorie-tracking-app.html
- Built AI app in high school, sold to MyFitnessPal (Inc.) — https://www.inc.com/ben-sherry/he-built-an-ai-app-in-high-school-made-40m-and-sold-to-myfitnesspal-now-hes-aiming-even-bigger/91307748
- MacroFactor vs. MyFitnessPal 2025 — https://macrofactor.com/macrofactor-vs-myfitnesspal-2025/
- 5 Best Calorie Counter Apps (Fortune) — https://fortune.com/article/best-calorie-counter-apps/
- MyFitnessPal barcode paywall (XDA) — https://www.xda-developers.com/myfitnesspals-barcode-scanner-behind-a-paywall/
- Lose It! Free vs Premium (SnapCalorie) — https://www.snapcalorie.com/blog/lose-it-free-vs-premium-differences-what-you-need-to-know.html
- Lose It Pricing 2026 (NutriScan) — https://nutriscan.app/blog/posts/lose-it-pricing-2026-free-vs-premium-2b4e921555
- Lose It! AI-Powered Logging press release — https://www.accessnewswire.com/newsroom/en/publishing-and-media/lose-it-finds-ai-powered-logging-boosts-weight-loss-success-and-greater-nutrit-1015267
- Yazio Review (Gaya) — https://www.trygaya.com/review/yazio-review
- YAZIO Pricing 2026 (NutriScan) — https://nutriscan.app/blog/posts/yazio-pricing-2026-free-vs-pro-what-pro-unlocks-33b26f8fc7
- Lifesum Premium Worth It 2026 (NutriScan) — https://nutriscan.app/blog/posts/lifesum-premium-worth-it-2026-meal-plans-macros-cost-6ffc879a6c
- Noom Program Cost 2026 — https://www.noom.com/blog/weight-management/noom-cost/
- Cronometer Gold — https://cronometer.com/gold/index.html
- FatSecret Platform API — https://platform.fatsecret.com/platform-api
- FatSecret API Editions — https://platform.fatsecret.com/api-editions
- The Evidence Base for AI Nutrition Accuracy: Systematic Review (Nutrient Metrics, 2026) — https://www.nutrientmetrics.com/en/guides/peer-reviewed-ai-nutrition-accuracy-literature-review
- Comparative study of VLMs for food ingredient recognition & nutrient estimation (PMC) — https://pmc.ncbi.nlm.nih.gov/articles/PMC13092701/
- Passio Nutrition-AI Cost Breakdown — https://www.passio.ai/cost-breakdown
- LogMeal Food AI — Image API pricing & docs — https://logmeal.com/api/pricing/
- Foodvisor Vision API docs — https://vision.foodvisor.io/docs
- Nutrition API by Nutritionix — https://www.nutritionix.com/api
- AI API Pricing Comparison 2026 (IntuitionLabs) — https://intuitionlabs.ai/articles/ai-api-pricing-comparison-grok-gemini-openai-claude
- LLM API Pricing 2026 (cloudidr) — https://www.cloudidr.com/llm-pricing
- USDA FoodData Central API Guide — https://fdc.nal.usda.gov/api-guide/
- Open Food Facts — Data, API and SDKs — https://world.openfoodfacts.org/data
- Open Food Facts (Wikipedia, 4M products 2025) — https://en.wikipedia.org/wiki/Open_Food_Facts
- Edamam Food Database API — https://developer.edamam.com/food-database-api
- Quagga2 vs html5-qrcode (Scanbot) — https://scanbot.io/blog/quagga2-vs-html5-qrcode-scanner/
- Best Nutrition API: Developer Comparison 2025 (CalorieAPI) — https://calorieapi.com/blog/best-food-nutrition-apis-2025
- Top Nutrition APIs for Developers 2026 (Spike API) — https://www.spikeapi.com/blog/top-nutrition-apis-for-developers-2026
- Mifflin-St Jeor Calculator (Inch Calculator) — https://www.inchcalculator.com/mifflin-st-jeor-calculator/

---

*Note on dossier gaps: two input dossiers ("PWA tech stack" and a duplicate "test" entry) contained only placeholder content; §6 is built from the one usable directive (Next.js App Router) plus standard PWA engineering. "Calzen" had no dedicated dossier and is treated as a Cal AI-pattern clone throughout (§2, §3), which matches the clone-the-wedge intent of this report.*
