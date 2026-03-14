/**
 * In-memory Cache Layer
 *
 * Simple TTL-based cache for frequently accessed data.
 * Avoids SQLite reads for hot paths like feed and profiles.
 */

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

/** Default TTLs in seconds */
const TTL = {
  feed: 30,
  profile: 300,
  analytics: 60,
  trending: 300,
  metrics: 15,
  balance: 10,
} as const;

type CacheCategory = keyof typeof TTL;

/** Get cached value or null if expired/missing */
export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

/** Store a value with TTL */
export function cacheSet<T>(key: string, data: T, category: CacheCategory): void {
  const ttlMs = TTL[category] * 1000;
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/** Store with custom TTL in seconds */
export function cacheSetTTL<T>(key: string, data: T, ttlSeconds: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/** Invalidate a specific key */
export function cacheInvalidate(key: string): void {
  store.delete(key);
}

/** Invalidate all keys matching a prefix */
export function cacheInvalidatePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/** Clear entire cache */
export function cacheClear(): void {
  store.clear();
}

/** Get cache stats */
export function cacheStats(): { size: number; keys: string[] } {
  // Cleanup expired entries
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.expiresAt) store.delete(key);
  }
  return { size: store.size, keys: Array.from(store.keys()) };
}

/**
 * Cache-through helper: get from cache or compute and store
 */
export function cached<T>(key: string, category: CacheCategory, compute: () => T): T {
  const existing = cacheGet<T>(key);
  if (existing !== null) return existing;
  const data = compute();
  cacheSet(key, data, category);
  return data;
}
