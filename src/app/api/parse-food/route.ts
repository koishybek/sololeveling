import { NextRequest, NextResponse } from "next/server";
import { parseFoodFromText } from "@/lib/ai/food";

export const runtime = "nodejs";
export const maxDuration = 30;

/** POST { text } -> { items: IdentifiedItem[] } */
export async function POST(req: NextRequest) {
  try {
    const { text, model } = (await req.json()) as {
      text?: string;
      model?: string;
    };
    if (!text?.trim()) {
      return NextResponse.json({ error: "Пустой текст" }, { status: 400 });
    }
    const result = await parseFoodFromText(text, model || undefined);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ошибка разбора" },
      { status: 500 },
    );
  }
}
