"use client";

import type { IdentifiedItem } from "@/lib/ai/food";
import type { FoodItem } from "@/lib/db/types";
import type { ResolvedFood } from "@/lib/food-data/types";
import { newId } from "@/lib/id";
import type { DraftItem } from "./types";

/**
 * Turn a model-identified item into a draft. The vision/text model gives a
 * reliable per-100g estimate for generic foods; for DB-precise numbers the
 * user can search (Open Food Facts) or scan a barcode. We don't auto-match
 * against a branded DB here — wrong matches are worse than an honest estimate.
 */
export async function resolveIdentified(item: IdentifiedItem): Promise<DraftItem> {
  return {
    key: newId(),
    name: item.name,
    grams: Math.max(1, Math.round(item.grams) || 100),
    cookingMethod: item.cookingMethod,
    per100g: item.estimatedPer100g,
    source: "estimate",
    isWholeFood: false,
    correctionMade: false,
    confidence: item.confidence,
  };
}

export function draftFromResolved(food: ResolvedFood, grams = 100): DraftItem {
  return {
    key: newId(),
    name: food.name,
    grams,
    cookingMethod: "unknown",
    per100g: food.per100g,
    source: food.source,
    sourceId: food.sourceId,
    barcode: food.barcode,
    brand: food.brand,
    isWholeFood: food.isWholeFood,
    correctionMade: false,
  };
}

/** Re-log a previously saved food (favorite / recent). */
export function draftFromFood(food: FoodItem, grams = 100): DraftItem {
  return {
    key: newId(),
    name: food.name,
    grams,
    cookingMethod: "unknown",
    per100g: food.per100g,
    source: food.source,
    sourceId: food.sourceId,
    barcode: food.barcode,
    brand: food.brand,
    isWholeFood: food.isWholeFood,
    correctionMade: false,
  };
}
