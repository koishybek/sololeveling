import type { FoodSource, Macros100g } from "@/lib/db/types";

/** A food resolved from an external source, ready to cache as a FoodItem. */
export interface ResolvedFood {
  name: string;
  source: FoodSource;
  sourceId?: string;
  barcode?: string;
  brand?: string;
  per100g: Macros100g;
  isWholeFood: boolean;
  /** Product/food thumbnail (remote URL from the source, if any). */
  imageUrl?: string;
}
