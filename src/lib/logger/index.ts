import { getEnv } from '@/lib/env';

type LogFields = Record<string, unknown>;

const REDACTED_KEYS = /key|token|secret|password|authorization|email|prompt|content|message/i;

function redact(fields: LogFields): LogFields {
  const output: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    output[key] = REDACTED_KEYS.test(key) ? '[redacted]' : value;
  }
  return output;
}

export const logger = {
  info(event: string, fields: LogFields = {}): void {
    console.info(JSON.stringify({ level: 'info', event, ...redact(fields) }));
  },
  warn(event: string, fields: LogFields = {}): void {
    console.warn(JSON.stringify({ level: 'warn', event, ...redact(fields) }));
  },
  error(event: string, fields: LogFields = {}): void {
    console.error(JSON.stringify({ level: 'error', event, ...redact(fields) }));
  },
  request(requestId: string | null, method: string, pathname: string, status: number, durationMs: number): void {
    console.info(JSON.stringify({ level: 'info', event: 'http.request', requestId, method, pathname, status, durationMs }));
  },
};

export function sessionCookieName(): string {
  return getEnv().SESSION_COOKIE_NAME;
}
