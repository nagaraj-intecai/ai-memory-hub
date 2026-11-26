import { ZodError } from 'zod';
import type { SpacetimeError, SpacetimeErrorCode } from '@/lib/spacetimedb/http';
import type { OpenRouterError } from '@/lib/openrouter/client';

export type ApiErrorDetails = Record<string, unknown>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ApiErrorDetails;

  constructor(status: number, code: string, message: string, details?: ApiErrorDetails) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(message: string, details?: ApiErrorDetails): ApiError {
  return new ApiError(400, 'bad_request', message, details);
}

export function unauthorized(message = 'Authentication required'): ApiError {
  return new ApiError(401, 'unauthorized', message);
}

export function forbidden(message = 'Forbidden'): ApiError {
  return new ApiError(403, 'forbidden', message);
}

export function notFound(message = 'Not found'): ApiError {
  return new ApiError(404, 'not_found', message);
}

export function conflict(message: string): ApiError {
  return new ApiError(409, 'conflict', message);
}

export function upstream(message: string, details?: ApiErrorDetails): ApiError {
  return new ApiError(502, 'upstream_error', message, details);
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      { error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } },
      { status: error.status },
    );
  }

  if (error instanceof SyntaxError) {
    return Response.json({ error: { code: 'invalid_json', message: 'Request body is not valid JSON' } }, { status: 400 });
  }

  if (error instanceof ZodError) {
    return Response.json(
      { error: { code: 'validation_error', message: 'Request validation failed', details: error.issues } },
      { status: 400 },
    );
  }

  const spacetimeError = error as Partial<SpacetimeError>;
  if (spacetimeError?.name === 'SpacetimeError') {
    const code = spacetimeError.code ?? 'transport';
    const status = code === 'transport' ? 502 : spacetimeError.status ?? 502;
    const codes: Record<SpacetimeErrorCode, string> = {
      validation: 'bad_request',
      conflict: 'conflict',
      not_found: 'not_found',
      forbidden: 'forbidden',
      unauthorized: 'unauthorized',
      transport: 'database_error',
    };
    const messages: Record<SpacetimeErrorCode, string> = {
      validation: 'Request rejected by database validation',
      conflict: 'Resource already exists',
      not_found: 'Resource not found',
      forbidden: 'Not allowed',
      unauthorized: 'Authentication required',
      transport: 'Database request failed',
    };
    return Response.json({ error: { code: codes[code], message: messages[code] } }, { status });
  }

  const openRouterError = error as Partial<OpenRouterError>;
  if (openRouterError?.name === 'OpenRouterError') {
    const allowed = new Set([400, 401, 402, 403, 404, 408, 409, 429, 500, 502, 503, 504]);
    const requested = openRouterError.status ?? 502;
    const status = allowed.has(requested) ? requested : 502;
    const code = openRouterError.code === 'invalid_model' || openRouterError.code === 'unknown_model'
      ? openRouterError.code
      : 'ai_provider_error';
    const message =
      status === 402
        ? 'AI provider requires more credits or a smaller request'
        : status === 429
          ? 'AI provider rate limit reached'
          : status === 401 || status === 403
            ? 'AI provider authentication failed'
            : status === 404
              ? 'AI provider resource not found'
              : status >= 500
                ? 'AI provider is unavailable'
                : 'AI provider rejected the request';
    return Response.json({ error: { code, message } }, { status });
  }

  return Response.json({ error: { code: 'internal_error', message: 'Internal server error' } }, { status: 500 });
}
