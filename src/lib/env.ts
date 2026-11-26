import { z } from 'zod';

const envSchema = z.object({
  SPACETIME_HTTP_URI: z.string().url().default('http://127.0.0.1:3000'),
  SPACETIME_DB_NAME: z.string().min(1).default('ai-memory-hub-v2'),
  OIDC_ISSUER: z.string().url(),
  OIDC_AUDIENCE: z.string().min(1),
  OIDC_JWKS_URL: z.string().url(),
  SESSION_COOKIE_NAME: z.string().min(1).default('aimh_session'),
  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  OPENROUTER_MODEL: z.string().min(1).default('openai/gpt-4o-mini'),
  OPENROUTER_EXTRACTION_MODEL: z.string().min(1).default('openai/gpt-4o-mini'),
  OPENROUTER_APP_URL: z.string().url().optional(),
  OPENROUTER_APP_TITLE: z.string().min(1).default('AI Memory Hub'),
  AUTO_EXTRACT_MEMORIES: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  MODEL_CATALOG_TTL_MS: z.coerce.number().int().min(0).default(300_000),
  MAX_CHAT_CONTEXT_MESSAGES: z.coerce.number().int().min(1).max(200).default(20),
  MAX_CHAT_CONTEXT_MEMORIES: z.coerce.number().int().min(1).max(100).default(12),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }
  return cachedEnv;
}

export function resetEnvCache(): void {
  cachedEnv = undefined;
}
