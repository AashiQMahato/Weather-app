import 'server-only';
import Groq from 'groq-sdk';

// Server-only Groq access. The key is read from GROQ_API_KEY and never leaves
// the server; routes return only generated text and the model name.

/** Tried in order when GROQ_MODEL is unset or not available to this key. */
const PREFERRED_MODELS = ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'];
const MODEL_CACHE_MS = 60 * 60 * 1000;

let client: Groq | null = null;
let modelCache: { model: string | null; checkedAt: number } | null = null;

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiUnavailableError';
  }
}

export function isAiConfigured() {
  return Boolean(process.env.GROQ_API_KEY);
}

export function getGroq(): Groq {
  if (!process.env.GROQ_API_KEY) throw new AiUnavailableError('AI is not configured (GROQ_API_KEY is missing).');
  client ??= new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 25_000, maxRetries: 1 });
  return client;
}

/**
 * Returns a chat model that is actually available to this key: GROQ_MODEL if
 * listed, otherwise the first available preferred model. Cached for an hour.
 */
export async function resolveModel(): Promise<string> {
  if (modelCache && Date.now() - modelCache.checkedAt < MODEL_CACHE_MS && modelCache.model) return modelCache.model;
  const requested = process.env.GROQ_MODEL?.trim();
  let available: string[] = [];
  try {
    const list = await getGroq().models.list();
    available = list.data.filter((m) => (m as { active?: boolean }).active !== false).map((m) => m.id);
  } catch (error) {
    if (error instanceof AiUnavailableError) throw error;
    if (error instanceof Groq.AuthenticationError) throw new AiUnavailableError('The Groq API key was rejected. Check GROQ_API_KEY.');
    // Listing failed for another reason (network, permissions). Trust the configuration rather than blocking.
    console.error('Groq model list failed:', describeError(error));
    return requested || PREFERRED_MODELS[0];
  }
  let model: string | null = null;
  if (requested && available.includes(requested)) model = requested;
  else {
    if (requested) console.warn(`GROQ_MODEL "${requested}" is not available; falling back.`);
    model = PREFERRED_MODELS.find((m) => available.includes(m)) ?? null;
  }
  if (!model) throw new AiUnavailableError('No supported Groq chat model is available for this API key.');
  modelCache = { model, checkedAt: Date.now() };
  return model;
}

/** Extra parameters for reasoning models, so output stays fast and in `content`. */
export function modelOptions(model: string) {
  return model.startsWith('openai/gpt-oss') ? ({ reasoning_effort: 'low' } as const) : {};
}

export function describeError(error: unknown) {
  if (error instanceof Groq.APIError) return `Groq API error ${error.status ?? ''}: ${error.message}`;
  if (error instanceof Error) return error.message;
  return String(error);
}

/** A short, user-safe message for a failed AI call. */
export function userMessage(error: unknown) {
  if (error instanceof AiUnavailableError) return error.message;
  if (error instanceof Groq.RateLimitError) return 'The AI service is busy right now. Please try again in a minute.';
  if (error instanceof Groq.APIConnectionTimeoutError) return 'The AI service took too long to respond.';
  if (error instanceof Groq.AuthenticationError) return 'The AI service rejected the server credentials.';
  return 'The AI service is temporarily unavailable.';
}

/** Requests a JSON object and returns the parsed value (unvalidated). */
export async function completeJson(system: string, user: string, maxTokens = 1800): Promise<{ data: unknown; model: string }> {
  const model = await resolveModel();
  const completion = await getGroq().chat.completions.create({
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.3,
    max_completion_tokens: maxTokens,
    response_format: { type: 'json_object' },
    ...modelOptions(model),
  });
  const content = completion.choices[0]?.message?.content ?? '';
  try {
    return { data: JSON.parse(content), model };
  } catch {
    throw new Error('The AI returned malformed JSON.');
  }
}
