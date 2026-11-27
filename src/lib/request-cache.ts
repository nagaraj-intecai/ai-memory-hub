import { AsyncLocalStorage } from 'node:async_hooks';

type RequestQueryCache = Map<string, Promise<unknown>>;

const storage = new AsyncLocalStorage<RequestQueryCache>();

export function runWithRequestCache<T>(handler: () => Promise<T>): Promise<T> {
  return storage.run(new Map(), handler);
}

export function cachedQuery<T>(key: string, query: () => Promise<T>): Promise<T> {
  const cache = storage.getStore();
  if (!cache) return query();

  const existing = cache.get(key);
  if (existing) return existing as Promise<T>;

  const pending = query();
  cache.set(key, pending);
  void pending.catch(() => {
    if (cache.get(key) === pending) cache.delete(key);
  });
  return pending;
}

export function invalidateRequestQueries(): void {
  storage.getStore()?.clear();
}
