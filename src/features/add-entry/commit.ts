"use client";

import type { CookingMethod } from "@/lib/ai/food";
import { db } from "@/lib/db/db";
import { dayKey, scaleMacros, upsertFood } from "@/lib/db/repo";
import type { LogEntry, Macros100g, Meal } from "@/lib/db/types";
import { newId } from "@/lib/id";
import type { DraftItem } from "./types";

/** Hidden-fat adjustment per serving by cooking method (research §4). */
const OIL: Record<CookingMethod, { kcal: number; fatG: number }> = {
  raw: { kcal: 0, fatG: 0 },
  boiled: { kcal: 0, fatG: 0 },
  baked: { kcal: 20, fatG: 2 },
  grilled: { kcal: 30, fatG: 3 },
  sauteed: { kcal: 60, fatG: 7 },
  fried: { kcal: 120, fatG: 13 },
  unknown: { kcal: 0, fatG: 0 },
};

/** Serving macros for a draft, including the cooking-oil adjustment. */
export function draftMacros(d: DraftItem): Macros100g {
  const m = scaleMacros(d.per100g, d.grams);
  const oil = OIL[d.cookingMethod];
  return {
    kcal: m.kcal + oil.kcal,
    proteinG: m.proteinG,
    carbG: m.carbG,
    fatG: m.fatG + oil.fatG,
  };
}

/** Persist all drafts as log entries under the given meal (today). */
export async function commitDrafts(drafts: DraftItem[], meal: Meal): Promise<void> {
  const date = dayKey();
  const now = Date.now();
  for (const d of drafts) {
    const food = await upsertFood({
      name: d.name,
      source: d.source,
      sourceId: d.sourceId,
      barcode: d.barcode,
      brand: d.brand,
      per100g: d.per100g,
      isWholeFood: d.isWholeFood,
    });
    const m = draftMacros(d);
    const entry: LogEntry = {
      id: newId(),
      date,
      meal,
      foodId: food.id,
      foodName: d.name,
      grams: d.grams,
      kcal: m.kcal,
      proteinG: m.proteinG,
      carbG: m.carbG,
      fatG: m.fatG,
      dbSource: d.source,
      correctionMade: d.correctionMade,
      isWholeFood: d.isWholeFood,
      createdAt: now,
    };
    await db.logEntries.add(entry);
  }
}
