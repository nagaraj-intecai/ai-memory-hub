import { getEnv } from '@/lib/env';
import { cachedQuery, invalidateRequestQueries } from '@/lib/request-cache';

export type SpacetimeErrorCode = 'validation' | 'conflict' | 'not_found' | 'forbidden' | 'unauthorized' | 'transport';

export class SpacetimeError extends Error {
  readonly status: number;
  readonly code: SpacetimeErrorCode;
  readonly details?: unknown;

  constructor(message: string, status: number, code: SpacetimeErrorCode = 'transport', details?: unknown) {
    super(message);
    this.name = 'SpacetimeError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function statusCode(status: number): SpacetimeErrorCode {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status >= 400 && status < 500) return 'validation';
  return 'transport';
}

function reducerError(payload: unknown): SpacetimeError {
  const raw =
    typeof payload === 'object' && payload !== null && 'Err' in payload ? (payload as { Err?: unknown }).Err : payload;
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
  const normalized = text.toLowerCase();

  if (normalized.includes('already') || normalized.includes('duplicate') || normalized.includes('exists')) {
    return new SpacetimeError('Resource already exists', 409, 'conflict', raw);
  }
  if (normalized.includes('forbidden') || normalized.includes('not owned') || normalized.includes('claims') || normalized.includes('service')) {
    return new SpacetimeError('Not allowed', 403, 'forbidden', raw);
  }
  if (normalized.includes('not found') || normalized.includes('missing')) {
    return new SpacetimeError('Resource not found', 404, 'not_found', raw);
  }
  return new SpacetimeError('Request rejected by database validation', 400, 'validation', raw);
}

type ProductElement = {
  name?: unknown;
  algebraic_type?: unknown;
};

type ProductSchema = {
  elements?: ProductElement[];
  Product?: {
    elements?: ProductElement[];
  };
};

type StatementResult = {
  schema?: ProductSchema;
  rows?: unknown;
};

function columnName(element: ProductElement, index: number): string {
  const name = element.name;
  if (typeof name === 'string') return name;
  if (typeof name === 'object' && name !== null && 'some' in name) {
    const some = (name as { some?: unknown }).some;
    if (typeof some === 'string') return some;
  }
  return `column_${index}`;
}

function typeTag(type: unknown): string | undefined {
  if (typeof type !== 'object' || type === null || Array.isArray(type)) return undefined;
  const keys = Object.keys(type);
  return keys[0];
}

function innerType(type: unknown): unknown {
  if (typeof type !== 'object' || type === null || Array.isArray(type)) return undefined;
  const value = Object.values(type)[0];
  if (Array.isArray(value)) return value[0];
  if (typeof value === 'object' && value !== null && 'ty' in value) return (value as { ty?: unknown }).ty;
  return undefined;
}

function decodeValue(type: unknown, value: unknown): unknown {
  if (value === null || value === undefined) return undefined;

  const tag = typeTag(type);
  if (tag === 'Option') return decodeValue(innerType(type), value);
  if (tag === 'Sum') {
    const variants = (type as { Sum?: { variants?: ProductElement[] } }).Sum?.variants ?? [];
    if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'number') {
      const variant = variants[value[0]];
      const variantName = variant ? columnName(variant, value[0]) : undefined;
      if (variantName === 'none') return undefined;
      return decodeValue(variant?.algebraic_type, value[1]);
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const record = value as { some?: unknown; none?: unknown };
      if ('none' in record) return undefined;
      if ('some' in record) {
        const someVariant = variants.find((variant) => columnName(variant, 0) === 'some') ?? variants[0];
        return decodeValue(someVariant?.algebraic_type, record.some);
      }
    }
  }
  if (tag === 'U64' || tag === 'I64') return typeof value === 'bigint' ? value.toString() : String(value);
  if (tag === 'U32' || tag === 'I32' || tag === 'U16' || tag === 'I16' || tag === 'U8' || tag === 'I8' || tag === 'F32' || tag === 'F64') {
    return typeof value === 'number' ? value : Number(value);
  }
  if (tag === 'Bool') return Boolean(value);
  if (tag === 'String') return String(value);
  if (tag === 'Timestamp') {
    if (typeof value === 'object' && value !== null && '__timestamp_micros_since_unix_epoch__' in value) {
      const micros = Number((value as { __timestamp_micros_since_unix_epoch__: unknown }).__timestamp_micros_since_unix_epoch__);
      return Number.isFinite(micros) ? new Date(Math.floor(micros / 1000)).toISOString() : String(value);
    }
    if (Array.isArray(value) && value.length > 0) {
      const micros = Number(value[0]);
      return Number.isFinite(micros) ? new Date(Math.floor(micros / 1000)).toISOString() : String(value[0]);
    }
    return String(value);
  }
  if (tag === 'Identity' || tag === 'ConnectionId' || tag === 'Uuid') {
    if (Array.isArray(value) && value.length > 0) return String(value[0]);
    if (typeof value === 'object' && value !== null) {
      const first = Object.values(value)[0];
      if (first !== undefined) return String(first);
    }
    return String(value);
  }
  return value;
}

function schemaElements(schema: ProductSchema | undefined): ProductElement[] {
  return schema?.elements ?? schema?.Product?.elements ?? [];
}

function decodeRow(schema: ProductSchema | undefined, row: unknown): Record<string, unknown> | undefined {
  if (typeof row === 'object' && row !== null && !Array.isArray(row)) {
    return row as Record<string, unknown>;
  }

  const values = Array.isArray(row) ? row : [];
  let elements = schemaElements(schema);

  // Unwrap single-column t.option(rowType) view responses
  if (elements.length === 1 && values.length === 1 && typeof values[0] === 'object' && values[0] !== null && !Array.isArray(values[0])) {
    const opt = values[0] as { some?: unknown; none?: unknown };
    if ('none' in opt) return undefined;
    if ('some' in opt && Array.isArray(opt.some)) {
      const sumVariants = (elements[0]?.algebraic_type as { Sum?: { variants?: ProductElement[] } } | undefined)?.Sum?.variants ?? [];
      const someVariant = sumVariants.find((variant) => columnName(variant, 0) === 'some') ?? sumVariants[0];
      const innerElements = (someVariant?.algebraic_type as ProductSchema | undefined)?.Product?.elements;
      if (innerElements) {
        elements = innerElements;
        const output: Record<string, unknown> = {};
        for (let index = 0; index < elements.length; index += 1) {
          const element = elements[index] ?? {};
          output[columnName(element, index)] = decodeValue(element.algebraic_type, opt.some[index]);
        }
        return output;
      }
    }
  }

  const output: Record<string, unknown> = {};
  for (let index = 0; index < elements.length; index += 1) {
    const element = elements[index] ?? {};
    output[columnName(element, index)] = decodeValue(element.algebraic_type, values[index]);
  }
  return output;
}

function databasePath(): string {
  const env = getEnv();
  return `${env.SPACETIME_HTTP_URI.replace(/\/$/, '')}/v1/database/${encodeURIComponent(env.SPACETIME_DB_NAME)}`;
}

async function spacetimeFetch(path: string, init: RequestInit, token: string): Promise<Response> {
  return fetch(`${databasePath()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
    cache: 'no-store',
  });
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function callReducer(token: string, reducerName: string, args: unknown[]): Promise<unknown> {
  const response = await spacetimeFetch(
    `/call/${encodeURIComponent(reducerName)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(args),
    },
    token,
  );
  const payload = await readJson(response);
  if (!response.ok) {
    const status = response.status >= 500 ? 502 : response.status;
    throw new SpacetimeError('Database request failed', status, statusCode(status), payload);
  }
  if (typeof payload === 'object' && payload !== null && 'Err' in payload) {
    throw reducerError(payload);
  }
  invalidateRequestQueries();
  return payload;
}

export async function queryRows(token: string, sql: string): Promise<Record<string, unknown>[]> {
  return cachedQuery(`query:${token}:${sql}`, async () => {
    const response = await spacetimeFetch(
      '/sql',
      {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: sql,
      },
      token,
    );
    const payload = await readJson(response);
    if (!response.ok) {
      const status = response.status >= 500 ? 502 : response.status;
      throw new SpacetimeError('Database query failed', status, statusCode(status), payload);
    }
    if (!Array.isArray(payload)) {
      throw new SpacetimeError('Database query returned an unexpected response', 502, 'transport', payload);
    }

    const rows: Record<string, unknown>[] = [];
    for (const result of payload as StatementResult[]) {
      const rawRows = Array.isArray(result.rows) ? result.rows : [];
      for (const row of rawRows) {
        const decoded = decodeRow(result.schema, row);
        if (decoded) rows.push(decoded);
      }
    }
    return rows;
  });
}

export function bigintString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number' || typeof value === 'string') return String(value);
  return String(value);
}

export function numberValue(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') return Number(value);
  return 0;
}

export function textValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string') return value;
  return String(value);
}
