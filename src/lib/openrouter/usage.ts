export type AiUsageSnapshot = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  costUsd: string;
  generationId?: string;
  finishReason?: string;
};

type UsageObject = {
  prompt_tokens?: unknown;
  completion_tokens?: unknown;
  total_tokens?: unknown;
  prompt_tokens_details?: { cached_tokens?: unknown };
  completion_tokens_details?: { reasoning_tokens?: unknown };
  cost?: unknown;
  total_cost?: unknown;
};

function numeric(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  }
  return 0;
}

export function createUsageSnapshot(): AiUsageSnapshot {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cachedTokens: 0,
    reasoningTokens: 0,
    costUsd: '0',
  };
}

export function mergeUsage(snapshot: AiUsageSnapshot, chunk: unknown): void {
  if (typeof chunk !== 'object' || chunk === null) return;

  const record = chunk as {
    id?: unknown;
    usage?: UsageObject;
    choices?: Array<{ finish_reason?: unknown }>;
    error?: unknown;
  };

  if (typeof record.id === 'string' && record.id.startsWith('gen-')) snapshot.generationId = record.id;

  const firstChoice = record.choices?.[0];
  if (firstChoice && typeof firstChoice.finish_reason === 'string') {
    snapshot.finishReason = firstChoice.finish_reason;
  }

  const usage = record.usage;
  if (!usage) return;

  snapshot.promptTokens = Math.max(snapshot.promptTokens, numeric(usage.prompt_tokens));
  snapshot.completionTokens = Math.max(snapshot.completionTokens, numeric(usage.completion_tokens));
  snapshot.totalTokens = Math.max(
    snapshot.totalTokens,
    numeric(usage.total_tokens) || snapshot.promptTokens + snapshot.completionTokens,
  );
  snapshot.cachedTokens = Math.max(snapshot.cachedTokens, numeric(usage.prompt_tokens_details?.cached_tokens));
  snapshot.reasoningTokens = Math.max(snapshot.reasoningTokens, numeric(usage.completion_tokens_details?.reasoning_tokens));

  const cost = usage.cost ?? usage.total_cost;
  if (typeof cost === 'number' || typeof cost === 'string') snapshot.costUsd = String(cost);
}

export function finalizeUsage(snapshot: AiUsageSnapshot): AiUsageSnapshot {
  return {
    ...snapshot,
    totalTokens: snapshot.totalTokens || snapshot.promptTokens + snapshot.completionTokens,
  };
}
