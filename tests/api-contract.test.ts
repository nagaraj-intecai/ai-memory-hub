import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/api-client';
import { errorResponse } from '@/middleware/errors';
import { SpacetimeError } from '@/lib/spacetimedb/http';
import { OpenRouterError } from '@/lib/openrouter/client';
import { importSchema } from '@/lib/validation/schemas';

function ndjsonResponse(lines: string[], conversationId = '42'): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(`${line}\n`));
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/x-ndjson', 'x-conversation-id': conversationId },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('API contracts', () => {
  it('streams NDJSON chunks and returns the server conversation id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ndjsonResponse([
      JSON.stringify({ type: 'content', text: 'Hel' }),
      JSON.stringify({ type: 'content', text: 'lo' }),
    ]));
    vi.stubGlobal('fetch', fetchMock);

    const onChunk = vi.fn();
    const result = await apiClient.streamChat({ message: 'hi', onChunk });

    expect(result.conversationId).toBe('42');
    expect(onChunk.mock.calls.map(([text]) => text).join('')).toBe('Hello');
    expect(fetchMock).toHaveBeenCalledWith('/api/chat', expect.objectContaining({ method: 'POST', credentials: 'include' }));
  });

  it('preserves the conversation id when a stream error event is received', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ndjsonResponse([
      JSON.stringify({ type: 'error', message: 'AI provider is unavailable' }),
    ], '77')));

    const error = await apiClient.streamChat({ message: 'hi', onChunk: vi.fn() }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('AI provider is unavailable');
    expect((error as Error & { conversationId?: string }).conversationId).toBe('77');
  });

  it('maps database and provider errors to sanitized responses', () => {
    const dbResponse = errorResponse(new SpacetimeError('raw reducer detail', 403, 'forbidden'));
    expect(dbResponse.status).toBe(403);
    expect(dbResponse.headers.get('content-type')).toContain('application/json');

    const providerResponse = errorResponse(new OpenRouterError('sk-or-secret', 402, 'insufficient_quota'));
    expect(providerResponse.status).toBe(402);
  });

  it('validates imported memory files before calling the API', () => {
    const valid = importSchema.safeParse({
      memories: [{ title: 'Title', content: 'Content', summary: 'Summary', category: 'projects', importance: 50 }],
    });
    const invalid = importSchema.safeParse({
      memories: [{ title: '', content: 'Content', summary: 'Summary', category: 'unknown', importance: 500 }],
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });
});
