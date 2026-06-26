import { NextRequest, NextResponse } from "next/server";
import { offSearch } from "@/lib/food-data/off";
import { usdaSearch } from "@/lib/food-data/usda";
import type { ResolvedFood } from "@/lib/food-data/types";

export const runtime = "nodejs";

/**
 * GET /api/food/search?q=... -> { foods: ResolvedFood[], source }
 * Prefers USDA when a real API key is configured (and reachable), otherwise
 * falls back to Open Food Facts (works without a key).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Нет запроса", foods: [] }, { status: 400 });
  }

  let foods: ResolvedFood[] = [];
  let source = "off";

  if (process.env.USDA_FDC_API_KEY) {
    try {
      foods = await usdaSearch(q, 12);
      source = "usda";
    } catch {
      /* USDA unreachable / rate-limited — fall through to OFF */
    }
  }

  if (!foods.length) {
    try {
      foods = await offSearch(q, 16);
      source = "off";
    } catch {
      return NextResponse.json(
        { foods: [], source, error: "Источник питания временно недоступен" },
        { status: 200 },
      );
    }
  }

  return NextResponse.json({ foods, source });
}
