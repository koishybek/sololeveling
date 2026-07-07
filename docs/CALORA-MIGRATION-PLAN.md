# Calora — миграция: план + дизайн-токены

> Пивот: убрать RPG-слой из UI (не трогая данные и ИИ-пайплайн) и переодеть
> экраны в дизайн-систему Calora из папки `# Mobile nutrition app prototype (1)`.
> Инфраструктуру НЕ переписываем. Код не трогаю до подтверждения плана.

Источники истины по дизайну: `Calora - Design System.dc.html` (точные токены и
спеки компонентов) + 6 PNG-макетов в `uploads/` (реальные экраны). Токены в
`_ds/…/tokens/*.css` — это базовый **Shopify Polaris** (серо-синий каркас
Claude Design); бренд Calora поверх него — сейджево-зелёный/кремовый. Берём
**Calora из `.dc.html`**, а не сырой Polaris.

---

## 1. Извлечённые дизайн-токены (готовы под `globals.css` @theme)

**Шрифт:** `Onest` (Google Fonts, 400–800) — не Inter. Грузим через `next/font/google` (самохостинг, без сети в рантайме).

```css
/* globals.css — заменяет тёмную Solo-Leveling палитру */
:root { color-scheme: light; }

@theme {
  /* Поверхности */
  --color-base:        #F8F7F3;  /* фон страницы (тёплый белый) */
  --color-surface:     #FFFFFF;  /* карточки */
  --color-surface-2:   #F1F0EB;  /* вторичные заливки (сегменты, чипы) */
  --color-track:       #ECEAE3;  /* трек прогресс-баров */
  --color-border:      #EDEBE4;  /* волосяная граница (hair) */
  --color-fg:          #2E2E33;  /* текст (ink) */
  --color-muted:       #9CA3AF;  /* приглушённый текст */

  /* Бренд (sage) */
  --color-accent:        #5FB88E;
  --color-accent-hover:  #4EA579; /* sage-dark */
  --color-accent-active: #458F68;
  --color-accent-soft:   #E6F2EA; /* sage-soft (тинты, выделения) */

  /* Макросы + мягкие тинты */
  --color-protein: #F59E8B;  --color-protein-soft: #FCE6E1;  /* коралл */
  --color-carb:    #F5C06B;  --color-carb-soft:    #FBEFD6;  /* янтарь */
  --color-fat:     #7BC4C0;  --color-fat-soft:     #E2F1F0;  /* бирюза */

  /* Статусы */
  --color-success: #5FB88E;
  --color-danger:  #E4736B;

  /* Радиусы */
  --radius-btn:   16px;
  --radius-card:  20px;
  --radius-sheet: 24px;
  --radius-pill:  9999px;

  /* Тени (одна мягкая для карточек + подъём) */
  --shadow-card: 0 6px 20px rgba(46,46,51,.06);
  --shadow-lift: 0 10px 28px rgba(46,46,51,.10);

  /* Шрифт */
  --font-sans: 'Onest', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
}
```

**Типографика (композитные стили):**
| Роль | Размер/интерлиньяж | Вес | Трекинг | Где |
|---|---|---|---|---|
| Display | 64–96 / 100 | 800 | −2px | крупные числа (кольцо калорий, план) |
| Headline | 30–32 / 40 | 600–700 | −.6px | заголовки экранов |
| Body | 16 / 24 | 400 | 0 | текст |
| Label | 12 / 16 | 500–600 | +1.5px, UPPERCASE | микро-подписи, секции (sage) |

Числа всегда `tabular-nums`.

**Ключевые тени/градиенты кнопок:** основная кнопка — `0 4px 12px rgba(95,184,142,.28)`; FAB — `0 6px 16px rgba(95,184,142,.4)`; вторичная — `inset 0 0 0 1.5px var(--accent)`.

**Анимации:** `ringFill` (кольцо), `barGrow` (макро-бары), `sheetUp` (шторка), `fadeIn`. Удаляем `pulseGlow` и прочие «системные» glow-эффекты.

---

## 2. Библиотека компонентов (`src/components/ui.tsx` + новые)

Переодеваем существующие примитивы и добавляем недостающие. Точные спеки — из `.dc.html`:

| Компонент | Спека Calora | Статус |
|---|---|---|
| `Button` (primary/secondary/disabled) | sage / прозрач.+ring / #DDE0DC; радиус 16; 15px паддинг; тень выше | адаптировать |
| `Card` | белый, радиус 20, `--shadow-card`, паддинг 16–22 | адаптировать |
| `Sheet` (bottom sheet) | верх радиус 24, грабер 38×5 `#DBD9D1`, бэкдроп `rgba(46,46,51,.35)`+blur(6px) | адаптировать |
| `ProgressRing` | трек `--track`, дуга sage, stroke 11, rounded caps, `ringFill` | адаптировать |
| `MacroBar` | иконка-кружок (30px, цвет макро) + label + `cur/max г` + трек 7px | адаптировать |
| `NumberField` | инпут на `--surface-2`, радиус 14 | адаптировать |
| `SegmentedControl` | фон `--surface-2` радиус 14, актив = белый+тень+ink | **новый** |
| `Stepper` | ± кнопки 38px белые rounded 11 с тенью, число 20/800 | **новый** |
| `Toggle` | пилюля 48×28, sage вкл / `#D6D4CC` выкл, кнопка 22px | **новый** |
| `Tag`/`Chip` (pill) | 12/600, паддинг 6×13, радиус pill, цвет+soft-фон | **новый** |
| `FoodRow` | thumb 44 rounded 12 + name + portion + kcal | **новый** |
| `MealCard` | иконка-кружок sage + название + kcal + ⋮ + строки | **новый** |
| `BottomNav` + `Fab` | белый, радиус 24, 4 таба + центральный sage FAB (56px, −14 сверху) | **новый** (заменяет текущий nav) |
| `WaterCard` | капля + мл + `+250/+500` outline-пилюли + волна снизу | **новый** (из макета дневника) |
| `SectionLabel` | 11/600 sage uppercase +1.5, с номером | **новый** |

Иконки — инлайн-SVG (stroke, 2–2.6, rounded), как в `.dc.html`: `home, chart, search, user, camera, mic, text, barcode, flame, drop, wheat, bicep, sun, sunrise, leaf`. Заведём `src/components/icons.tsx`.

---

## 3. Удаление RPG-слоя (недеструктивно)

**Убрать из рендера/навигации:**
- `src/features/character/*` (Статус, Журнал Системы, level-up overlay) — удалить из UI.
- `src/app/app-root.tsx` — убрать вкладку «Статус», `LevelUpWatcher`, `ensureDefaultHabits()`-сид, FAB-подпись из RPG.
- `src/features/dashboard/dashboard.tsx` — убрать строку ранга/уровня из шапки (`useGameView`).

**Перестать импортировать (файлы остаются на диске / в git-истории):**
- `src/lib/game/engine.ts`, `src/lib/ai/system.ts`, `src/lib/fx.ts`.
- `src/app/api/system/route.ts` — удалить роут (RPG).
- Хуки `useGameView`, `useSystemFeed`, `useActiveHabits`, `useHabitLogsToday` в `hooks.ts` — удалить.

**Данные не трогаем (остаются в схеме, недеструктивно):** таблицы `habits`, `habitLog`, `system`; поля `settings.{allocStr,allocInt,allocWil,lastSeenLevel,lastSeenRank,aiSystemModel}`; `LogEntry.{correctionMade,isWholeFood}` — остаются, но больше не дают наград. Экспорт/импорт продолжает их сериализовать (или дропает gracefully).

**Осиротевшие поля схемы (для отчёта):** всё перечисленное выше — данных не теряем, можно ре-активировать позже.

---

## 4. Стрик/консистентность без движка

`engine.ts` уходит, но метрика серии нужна на экране Insights. Извлекаю **чистый хелпер, независимый от `engine.ts`**, в `analytics.ts` (или `src/lib/streak.ts`):
- `loggedStreak(entries, today)` — сколько дней подряд есть хоть одна запись еды (простая привычка, без XP).
- Консистентность (5-недельный heatmap) уже есть в `analytics.ts` (`calendar`, `daysLogged`, `adherencePct`) — переиспользуем.

---

## 5. Экраны: маппинг на существующие фиче-папки

| Экран Calora | Папка | Действие |
|---|---|---|
| Онбординг (цель → …→ раскрытие плана) | `features/onboarding/` | сохранить логику/расчёт, переодеть шаги и «Start tracking» |
| Дневник (кольцо, макро-бары, вода, приёмы) | `features/dashboard/` | переодеть под макет |
| Шторка добавления (Фото/Голос/Текст/Поиск/Штрихкод + Недавние) | `features/add-entry/` | переодеть, все 5 методов остаются на своих роутах |
| Результат ИИ-скана (черновики + степперы + «AI estimate» + sticky total) | `features/add-entry/` | переодеть, поток scan→draft→scaleMacros→LogEntry прежний |
| Деталь/редактирование продукта | `features/dashboard/edit-entry-sheet` | переодеть (сегмент-контрол единиц, макро-карточки, избранное) |
| Поиск продуктов + Штрихкод | `features/add-entry/` | переодеть над теми же роутами |
| Прогресс (вес + 14-дн калории + средние) | `features/progress/` | переодеть (Recharts уже есть) |
| Insights (стрик + heatmap + пара инсайт-карточек) | `features/progress/` (секция) или новый | на хелпере из §4 |
| Настройки → «Me» | `features/settings/` | переодеть как экран-таб; **убрать секцию RPG «Дейлики Системы»**; экспорт/импорт оставить |
| **Foods** (браузер продуктов: поиск + недавние + избранное) | `features/foods/` | **новый** экран поверх search/barcode роутов |
| **Paywall** (заголовок, список фич, 2 тарифа, CTA) | `features/paywall/` | **новый**, статичный (без биллинга) |

---

## 6. Навигация

Текущая: 3 таба (Дневник/Статус/Прогресс) + FAB. **Новая: 4 таба + центральный FAB:**
**Дневник · Прогресс · (＋) · Продукты · Профиль** (Diary / Progress / (+) / Foods / Me).
FAB открывает шторку добавления. Статус-таб удаляется.

---

## 7. Имя приложения, шрифт, манифест

- Имя в ОДНОЙ константе `src/lib/app.ts` → `export const APP_NAME = "Calora"`. Использовать в шапке/экранах.
- `public/manifest.webmanifest` — `name`/`short_name` → `Calora` (иконки пока не трогаем).
- Шрифт **Onest** через `next/font/google` в `layout.tsx`, привязать к `--font-sans`.

---

## 8. Тесты и E2E

- `src/lib/nutrition/*` — должны остаться зелёными (RPG не затрагивают).
- `src/lib/game/engine.test.ts` — ссылается на удаляемый код → **удаляю осознанно** (не оставляю падать).
- E2E happy-path (онбординг → лог еды → перезагрузка → персистентность) — **сохранить**, обновив селекторы под новый UI (новые подписи/табы; «Статус» больше нет).
- После каждого экрана — `npm run typecheck`.

---

## 9. Порядок работ (по work order босса)

1. ✅ Прочитать KEEP + выдать план и токены (этот документ) — **ждём подтверждения**.
2. Токены → `globals.css` (@theme) + Onest; собрать/адаптировать библиотеку компонентов.
3. Снять RPG-слой (импорты, навигация, сиды) — приложение компилится чисто.
4. Переодеть экраны по одному; `npm run typecheck` после каждого.
5. Тесты: nutrition зелёные; удалить engine-тест; E2E happy-path под новый UI.
6. Отчёт: что убрано vs оставлено + осиротевшие поля схемы.

Инженерные правила соблюдаю строго: не писать в БД внутри `useLiveQuery` (только `useEffect`); Dexie только на клиенте (`ssr:false`); роуты — тонкие прокси; секреты в env Vercel, не в репо; не билдить при живом `next start` на том же `.next`.

---

## 10. Решения (зафиксированы 2026-06-27)

1. **Язык UI:** ✅ **Русский** — как в `.dc.html` (источник дизайна) и текущем приложении. Табы: Дневник · Прогресс · Продукты · Профиль.
2. **RPG-код:** ✅ **Удалить из репо** — git хранит историю; таблицы БД `habits`/`habitLog`/`system` остаются нетронутыми (данные целы).
3. **Insights:** ✅ **Секцией внутри вкладки «Прогресс»** (табов всего 4). Отдельного таба нет.
4. **«Me» и «Foods»:** Me = переодетые настройки как таб «Профиль»; Foods = новый браузер продуктов (поиск + недавние + избранное) поверх существующих `food/search`+`food/barcode` роутов.
