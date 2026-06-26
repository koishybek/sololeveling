import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/ai/food";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST multipart/form-data { audio: File } -> { text } */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Нет аудио" }, { status: 400 });
    }
    const text = await transcribeAudio(file);
    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ошибка распознавания речи" },
      { status: 500 },
    );
  }
}
