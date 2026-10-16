import { NextRequest, NextResponse } from "next/server";
import { offSearch } from "@/lib/food-data/off";
import { usdaSearch } from "@/lib/food-data/usda";
import type { ResolvedFood } from "@/lib/food-data/types";

export const runtime = "nodejs";

/**
 * GET /api/food/search?q=... -> { foods: ResolvedFood[], source }
 * Prefers USDA when a real API key is configured, otherwise Open Food Facts;
 * falls back to the other source when the first fails or finds nothing.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Нет запроса", foods: [] }, { status: 400 });
  }

  // Preferred source first; if it fails or finds nothing, try the other one
  // (OFF has outages; USDA works with DEMO_KEY when no key is configured).
  const order = process.env.USDA_FDC_API_KEY ? (["usda", "off"] as const) : (["off", "usda"] as const);
  let foods: ResolvedFood[] = [];
  let source: string = order[0];
  let failed = 0;
  for (const src of order) {
    try {
      foods = src === "usda" ? await usdaSearch(q, 12) : await offSearch(q, 16);
      source = src;
      if (foods.length) break;
    } catch {
      failed++;
    }
  }
  if (!foods.length && failed === order.length) {
    return NextResponse.json(
      { foods: [], source, error: "Базы продуктов временно недоступны — попробуй фото" },
      { status: 200 },
    );
  }

  return NextResponse.json({ foods, source });
}
