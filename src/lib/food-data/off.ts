import type { ResolvedFood } from "./types";

const OFF_BASE = "https://world.openfoodfacts.org";
const UA = "OlzhasERank/0.1 (personal calorie tracker)";

interface OffNutriments {
  ["energy-kcal_100g"]?: number;
  ["energy-kcal"]?: number;
  ["proteins_100g"]?: number;
  ["carbohydrates_100g"]?: number;
  ["fat_100g"]?: number;
}

interface OffProduct {
  code?: string;
  product_name?: string;
  generic_name?: string;
  brands?: string;
  nutriments?: OffNutriments;
}

function mapProduct(p: OffProduct, code: string): ResolvedFood {
  const n = p.nutriments ?? {};
  return {
    name: p.product_name || p.generic_name || (code ? `Штрихкод ${code}` : "Без названия"),
    source: "off",
    sourceId: code || undefined,
    barcode: code || undefined,
    brand: p.brands,
    per100g: {
      kcal: Math.round(n["energy-kcal_100g"] ?? n["energy-kcal"] ?? 0),
      proteinG: Math.round((n["proteins_100g"] ?? 0) * 10) / 10,
      carbG: Math.round((n["carbohydrates_100g"] ?? 0) * 10) / 10,
      fatG: Math.round((n["fat_100g"] ?? 0) * 10) / 10,
    },
    isWholeFood: false,
  };
}

/** Look up a barcode via Open Food Facts (live per-scan). Returns null if not found. */
export async function offBarcode(code: string): Promise<ResolvedFood | null> {
  const url = `${OFF_BASE}/api/v2/product/${encodeURIComponent(code)}?fields=code,product_name,generic_name,brands,nutriments`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { status?: number; product?: OffProduct };
  if (data.status !== 1 || !data.product) return null;
  return mapProduct(data.product, code);
}

/** Free-text product search via Open Food Facts. */
export async function offSearch(query: string, limit = 20): Promise<ResolvedFood[]> {
  const url =
    `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=${limit}` +
    `&fields=code,product_name,generic_name,brands,nutriments`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`OFF search failed: ${res.status}`);
  const data = (await res.json()) as { products?: OffProduct[] };
  return (data.products ?? [])
    .map((p) => mapProduct(p, p.code ?? ""))
    // drop physically-impossible values (bad community data / kJ mislabeled as kcal)
    .filter((f) => f.per100g.kcal > 0 && f.per100g.kcal <= 900);
}
