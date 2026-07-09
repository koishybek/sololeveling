import type { CookingMethod } from "@/lib/ai/food";
import type { FoodSource, Macros100g } from "@/lib/db/types";

/** A food being edited in the result card before it is logged. */
export interface DraftItem {
  key: string;
  name: string;
  grams: number;
  /** Frozen original AI/DB estimate — the "M / standard" portion for multipliers. */
  baseGrams: number;
  cookingMethod: CookingMethod;
  per100g: Macros100g;
  source: FoodSource;
  sourceId?: string;
  barcode?: string;
  brand?: string;
  isWholeFood: boolean;
  /** Set true when the user edits anything (kept for data continuity). */
  correctionMade: boolean;
  confidence?: number;
  /** Thumbnail: remote URL (DB match) or a data: URL (captured photo). */
  imageUrl?: string;
}
