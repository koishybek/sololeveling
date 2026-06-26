import type { CookingMethod } from "@/lib/ai/food";
import type { FoodSource, Macros100g } from "@/lib/db/types";

/** A food being edited in the result card before it is logged. */
export interface DraftItem {
  key: string;
  name: string;
  grams: number;
  cookingMethod: CookingMethod;
  per100g: Macros100g;
  source: FoodSource;
  sourceId?: string;
  barcode?: string;
  brand?: string;
  isWholeFood: boolean;
  /** Set true when the user edits anything — feeds Phase-2 INT XP. */
  correctionMade: boolean;
  confidence?: number;
}
