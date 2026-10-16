import OpenAI from "openai";

let client: OpenAI | null = null;

/** Lazily-constructed server-side Groq client (OpenAI-compatible API). */
export function getAI(): OpenAI {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set");
  }
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
      maxRetries: 0, // we fail over to the next model instead of retrying
    });
  }
  return client;
}

export type AITask = "vision" | "text" | "transcribe";

function chain(envVar: string | undefined, defaults: string[]): string[] {
  const fromEnv = (envVar ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...fromEnv, ...defaults])];
}

/**
 * Model fallback chains, first = preferred. Env vars take a comma-separated
 * list that is tried before the defaults.
 */
export const MODEL_CHAINS: Record<AITask, string[]> = {
  vision: chain(process.env.AI_VISION_MODEL, [
    "qwen/qwen3.8-27b",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
  ]),
  text: chain(process.env.AI_TEXT_MODEL, [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
  ]),
  transcribe: chain(process.env.AI_TRANSCRIBE_MODEL, [
    "whisper-large-v3-turbo",
    "whisper-large-v3",
  ]),
};

/** Models that hit a quota, mapped to the epoch ms they become usable again. */
const cooldownUntil = new Map<string, number>();

const DEFAULT_COOLDOWN_MS = 60_000;
const MISSING_MODEL_COOLDOWN_MS = 60 * 60_000;

function retryAfterMs(err: InstanceType<typeof OpenAI.APIError>): number {
  const raw = err.headers?.get?.("retry-after");
  const sec = raw ? Number(raw) : NaN;
  return Number.isFinite(sec) && sec > 0 ? sec * 1000 : DEFAULT_COOLDOWN_MS;
}

/**
 * Whether an error is specific to this model (quota, missing/decommissioned
 * model, unsupported feature, overload) so the next model may succeed.
 */
function isModelSpecific(err: unknown): boolean {
  if (!(err instanceof OpenAI.APIError)) return false;
  const status = err.status ?? 0;
  if (status === 429 || status === 404 || status >= 500) return true;
  if (status === 400) {
    return /model|decommission|response_format|json_schema|image|not support/i.test(
      err.message,
    );
  }
  return false;
}

/**
 * Run `fn` against each model in the task's chain until one succeeds.
 * A model that returns 429 is skipped for its Retry-After window.
 */
export async function withModelFallback<T>(
  task: AITask,
  fn: (model: string) => Promise<T>,
): Promise<T> {
  const models = MODEL_CHAINS[task];
  const now = Date.now();
  const ready = models.filter((m) => (cooldownUntil.get(m) ?? 0) <= now);
  // All on cooldown: still try them in order rather than failing outright.
  const order = ready.length ? ready : models;

  let lastErr: unknown;
  let rateLimited = false;
  for (const model of order) {
    try {
      return await fn(model);
    } catch (err) {
      lastErr = err;
      if (!isModelSpecific(err)) throw err;
      if (err instanceof OpenAI.APIError && err.status === 429) {
        rateLimited = true;
        cooldownUntil.set(model, Date.now() + retryAfterMs(err));
      } else if (err instanceof OpenAI.APIError && err.status === 404) {
        // Model not available on this account — don't waste a call on it for a while.
        cooldownUntil.set(model, Date.now() + MISSING_MODEL_COOLDOWN_MS);
      }
      console.warn(`[ai] ${task}: ${model} failed (${(err as Error).message}), trying next`);
    }
  }
  // A quota hit is the real cause even if later fallbacks failed differently.
  if (rateLimited) {
    throw new Error("Лимит запросов к ИИ исчерпан на всех моделях — попробуй через минуту");
  }
  throw lastErr instanceof Error ? lastErr : new Error("Все модели ИИ недоступны");
}
