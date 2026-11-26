import OpenAI from 'openai';
import { getEnv } from '@/lib/env';

export class OpenRouterError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'OpenRouterError';
    this.status = status;
    this.code = code;
  }
}

let client: OpenAI | undefined;

export function getOpenRouterClient(): OpenAI {
  if (!client) {
    const env = getEnv();
    const defaultHeaders: Record<string, string> = {
      'HTTP-Referer': env.OPENROUTER_APP_URL ?? 'http://localhost:3000',
      'X-OpenRouter-Title': env.OPENROUTER_APP_TITLE,
    };
    client = new OpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: env.OPENROUTER_BASE_URL,
      defaultHeaders,
    });
  }
  return client;
}

type ModelRecord = {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: Record<string, string>;
};

let cachedModels: { models: ModelRecord[]; expiresAt: number } | undefined;

export async function fetchModels(forceRefresh = false): Promise<ModelRecord[]> {
  const env = getEnv();
  if (!forceRefresh && cachedModels && cachedModels.expiresAt > Date.now()) {
    return cachedModels.models;
  }

  const response = await fetch(`${env.OPENROUTER_BASE_URL.replace(/\/$/, '')}/models`, {
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': env.OPENROUTER_APP_URL ?? 'http://localhost:3000',
      'X-OpenRouter-Title': env.OPENROUTER_APP_TITLE,
    },
    cache: 'no-store',
  });

  const payload: unknown = await response.json();
  if (!response.ok) {
    throw new OpenRouterError('Unable to fetch OpenRouter model catalog', response.status);
  }
  if (typeof payload !== 'object' || payload === null || !('data' in payload) || !Array.isArray(payload.data)) {
    throw new OpenRouterError('OpenRouter model catalog response was malformed');
  }

  const models = payload.data.filter((model): model is ModelRecord => {
    return typeof model === 'object' && model !== null && typeof (model as { id?: unknown }).id === 'string';
  });
  cachedModels = { models, expiresAt: Date.now() + env.MODEL_CATALOG_TTL_MS };
  return models;
}

export function isValidModelId(model: string): boolean {
  return /^[a-z0-9._-]+\/[a-z0-9._:-]+$/i.test(model);
}

export async function assertModelAvailable(model: string): Promise<void> {
  if (!isValidModelId(model)) throw new OpenRouterError('Invalid model id', 400, 'invalid_model');
  const models = await fetchModels();
  if (!models.some((entry) => entry.id === model)) {
    throw new OpenRouterError(`Model ${model} is not available`, 400, 'unknown_model');
  }
}

function providerMessage(status: number | undefined, fallback: string): string {
  if (status === 402) return 'AI provider requires more credits or a smaller request';
  if (status === 429) return 'AI provider rate limit reached';
  if (status === 401 || status === 403) return 'AI provider authentication failed';
  if (status === 404) return 'AI provider resource not found';
  if (status !== undefined && status >= 500) return 'AI provider is unavailable';
  return fallback;
}

export function normalizeOpenRouterError(error: unknown): OpenRouterError {
  if (error instanceof OpenRouterError) return error;
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { status?: unknown; code?: unknown };
    if (typeof candidate.status === 'number') {
      const code = typeof candidate.code === 'string' ? candidate.code : undefined;
      return new OpenRouterError(providerMessage(candidate.status, 'AI provider rejected the request'), candidate.status, code);
    }
  }
  return new OpenRouterError('AI provider request failed');
}

export type ChatParams = Parameters<ReturnType<typeof getOpenRouterClient>['chat']['completions']['create']>[0];

export async function createChatCompletion(params: Record<string, unknown>) {
  try {
    return await getOpenRouterClient().chat.completions.create(params as unknown as ChatParams);
  } catch (error) {
    throw normalizeOpenRouterError(error);
  }
}
