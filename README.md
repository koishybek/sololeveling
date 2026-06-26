# Олжас E-Rank — AI Calorie Tracker + Solo Leveling RPG

A mobile-first **PWA** that combines a Cal AI / Calzen-style **AI calorie tracker** with a
**Solo-Leveling RPG progression layer** (ranks E→S, STR/INT/WIL stats, daily quests, weight "gates").
Local-first, offline-capable, single-user.

## Features

**Tracking**
- 📷 **AI photo scan** — point the camera at food, GPT-4o identifies items + portions
- 🎤 **Voice logging** — describe your meal, Whisper transcribes → parsed into foods
- ⌨️ **Text** & 🔍 **search** (Open Food Facts) & ▦ **barcode** (Open Food Facts)
- Editable result cards (grams, cooking-method oil adjustment), favorites & one-tap re-log
- Calories ring + macro bars, water tracking, per-day history navigation
- Weight log, 14-day calorie chart, averages, 5-week consistency calendar

**Gamification (Phase 2)**
- XP / levels / ranks **E → D → C → B → A → S**, derived from logging behavior
- Daily quests, weekly challenges, streaks & penalty, level-up celebration
- Weight "gates" (95 / 90 / 85 / 80 kg)

**Serious-app**
- Full **data export / import (JSON backup)** + reset — your local data is portable
- Editable profile/goals with live plan recompute (Mifflin-St Jeor)
- AI model picker, toasts, installable PWA

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · **Dexie/IndexedDB** (local-first) ·
OpenAI (vision/whisper/text) · Recharts · Quagga2 (barcode) · Vitest

The whole app renders client-side (`page.tsx` uses `dynamic(..., { ssr: false })`) so IndexedDB
never touches the server. Next route handlers are thin proxies that hide the OpenAI key and
proxy nutrition lookups.

## Getting started

```bash
npm install
cp .env.example .env   # then fill in OPENAI_API_KEY
npm run dev
```

Open http://localhost:3000 (camera/mic/PWA install require HTTPS or localhost).

### Scripts
- `npm run dev` — dev server
- `npm run build` / `npm start` — production
- `npm test` — unit tests (nutrition math, persistence, game engine, analytics)
- `npm run typecheck` — TypeScript

### Environment
- `OPENAI_API_KEY` — required for photo/voice/text AI (the `.env` file is gitignored)
- `USDA_FDC_API_KEY` — optional; falls back to Open Food Facts when unset/unreachable

## Architecture

```
src/
  app/            Next routes + API proxies (scan / transcribe / parse-food / food search / barcode)
  components/     UI primitives, toast, service-worker register
  features/       onboarding · dashboard · add-entry · character (RPG) · progress · settings
  lib/
    db/           Dexie schema + repository (local-first store, backup/restore)
    ai/           OpenAI client + food identification
    food-data/    Open Food Facts + USDA clients
    nutrition/    BMR/TDEE/macro math (pure, tested)
    game/         RPG engine — stats/ranks/quests/challenges (pure, tested)
    analytics.ts  history aggregation (pure, tested)
```

## Status

Phase 1 (tracker) and Phase 2 (RPG) complete and verified end-to-end. Push notifications
for daily-quest reminders are the one deferred item (needs an always-on push backend).
