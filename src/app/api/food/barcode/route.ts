import { NextRequest, NextResponse } from "next/server";
import { offBarcode } from "@/lib/food-data/off";

export const runtime = "nodejs";

/** GET /api/food/barcode?code=... -> { food: ResolvedFood } | 404 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ error: "Нет штрихкода" }, { status: 400 });
  }
  try {
    const food = await offBarcode(code);
    if (!food) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }
    return NextResponse.json({ food });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ошибка поиска" },
      { status: 502 },
    );
  }
}
