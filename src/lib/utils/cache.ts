import 'server-only';

/** Small in-memory TTL cache for expensive server work (per instance). */
export function createCache<T>(ttlMs: number, maxEntries = 500) {
  const store = new Map<string, { value: T; expiresAt: number }>();
  return {
    get(key: string): T | undefined {
      const hit = store.get(key);
      if (!hit) return undefined;
      if (hit.expiresAt <= Date.now()) {
        store.delete(key);
        return undefined;
      }
      return hit.value;
    },
    set(key: string, value: T) {
      if (store.size >= maxEntries) store.delete(store.keys().next().value as string);
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
  };
}
