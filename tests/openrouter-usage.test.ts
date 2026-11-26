import { describe, expect, it } from 'vitest';
import { createUsageSnapshot, finalizeUsage, mergeUsage } from '@/lib/openrouter/usage';

describe('OpenRouter usage', () => {
  it('extracts token usage and generation id', () => {
    const snapshot = createUsageSnapshot();
    mergeUsage(snapshot, {
      id: 'gen-123',
      choices: [{ finish_reason: 'stop' }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
        prompt_tokens_details: { cached_tokens: 3 },
        completion_tokens_details: { reasoning_tokens: 2 },
        cost: '0.001',
      },
    });

    const usage = finalizeUsage(snapshot);
    expect(usage.totalTokens).toBe(15);
    expect(usage.cachedTokens).toBe(3);
    expect(usage.reasoningTokens).toBe(2);
    expect(usage.generationId).toBe('gen-123');
    expect(usage.costUsd).toBe('0.001');
    expect(usage.finishReason).toBe('stop');
  });

  it('falls back to prompt plus completion tokens', () => {
    const snapshot = createUsageSnapshot();
    mergeUsage(snapshot, { usage: { prompt_tokens: 8, completion_tokens: 4 } });
    expect(finalizeUsage(snapshot).totalTokens).toBe(12);
  });
});
