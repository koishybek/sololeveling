import type { ResolvedFood } from "./types";

const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";

// USDA nutrient numbers
const N_ENERGY_KCAL = ["208", "1008"];
const N_PROTEIN = ["203", "1003"];
const N_FAT = ["204", "1004"];
const N_CARB = ["205", "1005"];

interface UsdaNutrient {
  nutrientNumber?: string;
  nutrientId?: number;
  value?: number;
}

interface UsdaFood {
  fdcId: number;
  description: string;
  brandName?: string;
  brandOwner?: string;
  dataType?: string;
  foodNutrients?: UsdaNutrient[];
}

function pickNutrient(food: UsdaFood, numbers: string[]): number {
  const match = (food.foodNutrients ?? []).find(
    (n) =>
      numbers.includes(String(n.nutrientNumber)) ||
      numbers.includes(String(n.nutrientId)),
  );
  return Math.round((match?.value ?? 0) * 10) / 10;
}

function mapFood(food: UsdaFood): ResolvedFood {
  const branded = food.dataType === "Branded" || Boolean(food.brandName);
  return {
    name: food.description,
    source: "usda",
    sourceId: String(food.fdcId),
    brand: food.brandName ?? food.brandOwner,
    per100g: {
      kcal: pickNutrient(food, N_ENERGY_KCAL),
      proteinG: pickNutrient(food, N_PROTEIN),
      carbG: pickNutrient(food, N_CARB),
      fatG: pickNutrient(food, N_FAT),
    },
    isWholeFood: !branded,
  };
}

/** Search USDA FoodData Central; returns foods with per-100g macros. */
export async function usdaSearch(
  query: string,
  limit = 10,
): Promise<ResolvedFood[]> {
  const key = process.env.USDA_FDC_API_KEY || "DEMO_KEY";
  const url =
    `${USDA_BASE}/foods/search?api_key=${key}` +
    `&query=${encodeURIComponent(query)}` +
    `&pageSize=${limit}` +
    `&dataType=${encodeURIComponent("Foundation,SR Legacy,Survey (FNDDS),Branded")}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) {
    throw new Error(`USDA search failed: ${res.status}`);
  }
  const data = (await res.json()) as { foods?: UsdaFood[] };
  return (data.foods ?? [])
    .map(mapFood)
    .filter((f) => f.per100g.kcal > 0 || f.per100g.proteinG > 0);
}
