import OpenAI from "openai";

let client: OpenAI | null = null;

/** Lazily-constructed server-side OpenAI client. Throws if the key is missing. */
export function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

/** Model selection — overridable via env so we can use the whole OpenAI lineup. */
export const MODELS = {
  vision: process.env.AI_VISION_MODEL ?? "gpt-4o",
  text: process.env.AI_TEXT_MODEL ?? "gpt-4o-mini",
  transcribe: process.env.AI_TRANSCRIBE_MODEL ?? "whisper-1",
} as const;
