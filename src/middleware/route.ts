import { z } from 'zod';
import { badRequest, errorResponse } from '@/middleware/errors';
import { logger } from '@/lib/logger';
import { runWithRequestCache } from '@/lib/request-cache';

export async function handleRoute(name: string, handler: () => Promise<Response>): Promise<Response> {
  const startedAt = Date.now();
  const requestId = handler.name || name;
  try {
    const response = await runWithRequestCache(handler);
    logger.request(requestId, 'route', name, response.status, Date.now() - startedAt);
    return response;
  } catch (error) {
    const response = errorResponse(error);
    logger.request(requestId, 'route', name, response.status, Date.now() - startedAt);
    if (response.status >= 500) logger.error('route.failed', { route: name, error: error instanceof Error ? error.message : 'unknown' });
    return response;
  }
}

export async function parseJson<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  const body: unknown = await request.json();
  return schema.parse(body);
}

export function parseSearchParams<S extends z.ZodType>(request: Request, schema: S): z.infer<S> {
  const url = new URL(request.url);
  return schema.parse(Object.fromEntries(url.searchParams.entries()));
}

export function parseId(value: string): bigint {
  if (!/^\d+$/.test(value)) throw badRequest('Invalid id');
  return BigInt(value);
}
