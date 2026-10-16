import { NextRequest, NextResponse } from "next/server";
import { identifyFoodFromImage } from "@/lib/ai/food";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { image: dataUrl } -> { items: IdentifiedItem[] } */
export async function POST(req: NextRequest) {
  try {
    const { image } = (await req.json()) as { image?: string };
    if (!image) {
      return NextResponse.json({ error: "Нет изображения" }, { status: 400 });
    }
    const result = await identifyFoodFromImage(image);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ошибка распознавания" },
      { status: 500 },
    );
  }
}
