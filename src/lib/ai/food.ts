import type { Macros100g } from "@/lib/db/types";
import { getOpenAI, MODELS } from "./openai";

export type CookingMethod =
  | "raw"
  | "boiled"
  | "grilled"
  | "fried"
  | "baked"
  | "sauteed"
  | "unknown";

export interface IdentifiedItem {
  /** Food name in Russian. */
  name: string;
  /** Estimated edible portion in grams. */
  grams: number;
  cookingMethod: CookingMethod;
  /** Model confidence, 0..1. */
  confidence: number;
  /** Rough per-100g macros — FALLBACK ONLY; real numbers come from the DB. */
  estimatedPer100g: Macros100g;
}

export interface FoodIdentification {
  items: IdentifiedItem[];
}

const FOOD_JSON_SCHEMA = {
  name: "food_identification",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      items: {
        type: "array",
        description: "Each distinct food/drink item detected.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: {
              type: "string",
              description: "Concise food name in Russian (e.g. 'Куриная грудка').",
            },
            grams: {
              type: "number",
              description:
                "Estimated edible portion in grams, using plate/utensil size as scale.",
            },
            cookingMethod: {
              type: "string",
              enum: [
                "raw",
                "boiled",
                "grilled",
                "fried",
                "baked",
                "sauteed",
                "unknown",
              ],
            },
            confidence: { type: "number", description: "0..1" },
            estimatedPer100g: {
              type: "object",
              additionalProperties: false,
              properties: {
                kcal: { type: "number" },
                proteinG: { type: "number" },
                carbG: { type: "number" },
                fatG: { type: "number" },
              },
              required: ["kcal", "proteinG", "carbG", "fatG"],
            },
          },
          required: [
            "name",
            "grams",
            "cookingMethod",
            "confidence",
            "estimatedPer100g",
          ],
        },
      },
    },
    required: ["items"],
  },
} as const;

const SYSTEM_PROMPT = `Ты — ассистент по распознаванию еды для трекера калорий.
Определи каждое отдельное блюдо/напиток. Оцени съедобную порцию в граммах,
используя тарелку и приборы как масштаб. Дай примерные макросы на 100 г как
грубую оценку (это запасной вариант — точные числа берутся из базы данных).
Названия — на русском. Если не уверен в способе готовки — "unknown".`;

function parseResult(content: string | null): FoodIdentification {
  if (!content) return { items: [] };
  try {
    const parsed = JSON.parse(content) as FoodIdentification;
    return { items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { items: [] };
  }
}

/** Identify foods from a photo (data URL or remote URL). */
export async function identifyFoodFromImage(
  imageUrl: string,
  model: string = MODELS.vision,
): Promise<FoodIdentification> {
  const res = await getOpenAI().chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Определи блюда на этом фото." },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    response_format: { type: "json_schema", json_schema: FOOD_JSON_SCHEMA },
  });
  return parseResult(res.choices[0]?.message?.content ?? null);
}

/** Parse a free-text meal description ("2 яйца и тост") into food items. */
export async function parseFoodFromText(
  text: string,
  model: string = MODELS.text,
): Promise<FoodIdentification> {
  const res = await getOpenAI().chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Что я съел: ${text}` },
    ],
    response_format: { type: "json_schema", json_schema: FOOD_JSON_SCHEMA },
  });
  return parseResult(res.choices[0]?.message?.content ?? null);
}

/** Transcribe a voice recording to text via Whisper. */
export async function transcribeAudio(file: File): Promise<string> {
  const res = await getOpenAI().audio.transcriptions.create({
    model: MODELS.transcribe,
    file,
  });
  return res.text;
}
