/**
 * 3-Layer Cache System
 *
 * L1 — Page/render cache  (Redis, 1 hour TTL)    an:page:{key}
 * L2 — Query cache        (Redis, 15 min TTL)    an:query:{key}
 * L3 — Source of truth    (PostgreSQL)
 *
 * Event-based invalidation: admin actions call invalidateByPrefix() to bust
 * all related cache keys atomically.
 */

import { redis } from "./redis";

export const CACHE_TTL = {
  PAGE:     3600,   // 1 hour
  QUERY:    900,    // 15 minutes
  CONFIG:   1800,   // 30 minutes
  SESSION:  86400,  // 24 hours
} as const;

// ── Read ───────────────────────────────────────────────────────────────────────

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null; // graceful degradation — fall through to DB
  }
}

// ── Write ──────────────────────────────────────────────────────────────────────

export async function setCached<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // ignore — cache write failure is non-fatal
  }
}

// ── Delete one key ─────────────────────────────────────────────────────────────

export async function deleteCached(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {}
}

// ── Invalidate by prefix ───────────────────────────────────────────────────────
// NOTE: ioredis keyPrefix is not applied to SCAN MATCH patterns, so we scan
// with the physical prefix and delete with logical keys that ioredis prefixes.

export async function invalidateByPrefix(prefix: string): Promise<number> {
  try {
    // Use SCAN instead of KEYS for production safety (non-blocking)
    let cursor = "0";
    let deleted = 0;
    const keyPrefix = (redis as { options?: { keyPrefix?: string } }).options?.keyPrefix ?? "";
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        `${keyPrefix}${prefix}*`,
        "COUNT",
        100
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        const pipeline = redis.pipeline();
        for (const key of keys) {
          const logicalKey = keyPrefix && key.startsWith(keyPrefix)
            ? key.slice(keyPrefix.length)
            : key;
          pipeline.del(logicalKey);
        }
        const results = await pipeline.exec();
        deleted += results?.length ?? 0;
      }
    } while (cursor !== "0");
    return deleted;
  } catch {
    return 0;
  }
}

// ── Named cache-busting events ─────────────────────────────────────────────────
// Call these from admin mutation handlers to bust all related caches.

export const cacheInvalidate = {
  products: () => Promise.all([
    invalidateByPrefix("query:products"),
    invalidateByPrefix("query:product:"),
    invalidateByPrefix("query:related:"),
    invalidateByPrefix("page:shop"),
    invalidateByPrefix("page:cms:landing"),
  ]),

  orders: () => Promise.all([
    invalidateByPrefix("query:orders"),
    invalidateByPrefix("page:admin:orders"),
  ]),

  blog: () => Promise.all([
    invalidateByPrefix("query:blog"),
    invalidateByPrefix("page:blog"),
  ]),

  cms: () => Promise.all([
    invalidateByPrefix("query:cms"),
    invalidateByPrefix("page:cms:landing"),
  ]),

  cmsPages: () => Promise.all([
    invalidateByPrefix("query:cms:pages"),
    invalidateByPrefix("page:cms:pages"),
    invalidateByPrefix("page:sitemap"),
  ]),

  menus: () => Promise.all([
    invalidateByPrefix("query:cms:menus"),
    invalidateByPrefix("page:cms:menus"),
    invalidateByPrefix("page:cms:landing"),
  ]),

  config: () => Promise.all([
    invalidateByPrefix("query:config"),
    invalidateByPrefix("page:cms:landing"),
    invalidateByPrefix("page:cms:menus"),
    invalidateByPrefix("page:sitemap"),
  ]),

  seo: () => Promise.all([
    invalidateByPrefix("query:seo"),
    invalidateByPrefix("page:sitemap"),
    invalidateByPrefix("page:robots"),
  ]),

  testimonials: () => Promise.all([
    invalidateByPrefix("query:testimonials"),
    invalidateByPrefix("page:cms:landing"),
  ]),

  traffic: () => Promise.all([
    invalidateByPrefix("query:traffic"),
    invalidateByPrefix("page:admin:analytics"),
  ]),
};

// ── Cache-aside helper (read-through pattern) ──────────────────────────────────

export async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await getCached<T>(key);
  if (cached !== null) return cached;
  const fresh = await fetcher();
  await setCached(key, fresh, ttl);
  return fresh;
}
