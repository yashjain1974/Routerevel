// server/src/lib/cache.ts
// Redis cache with proper Upstash TLS support.
// Upstash requires rediss:// (TLS) — this is auto-detected from the URL.

import Redis from "ioredis"

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

// Detect if using TLS (Upstash uses rediss://)
const isTLS = REDIS_URL.startsWith("rediss://")

export const redis = new Redis(REDIS_URL, {
  // TLS required for Upstash cloud Redis
  tls: isTLS ? {} : undefined,

  maxRetriesPerRequest: 3,
  connectTimeout:       10000,  // 10s — Upstash can be slow on cold start
  commandTimeout:       8000,   // 8s per command
  lazyConnect:          true,

  retryStrategy(times) {
    if (times > 3) return null
    return Math.min(times * 1000, 3000)
  },
})

redis.on("connect", () => {
  const host = REDIS_URL.split("@")[1] || "localhost"
  console.log(`[REDIS] ✅ Connected to ${host}`)
})

redis.on("error", (err) => {
  // Only log unique errors — suppress repeated connection noise
  console.warn("[REDIS] ⚠", err.message)
})

// ── Cache get ─────────────────────────────────────────────────────
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key)
    if (!value) return null
    return JSON.parse(value) as T
  } catch (err) {
    console.warn("[CACHE GET]", err instanceof Error ? err.message : err)
    return null
  }
}

// ── Cache set ─────────────────────────────────────────────────────
export async function cacheSet(
  key:   string,
  value: unknown,
  ttl:   number = 86400
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttl)
  } catch (err) {
    console.warn("[CACHE SET]", err instanceof Error ? err.message : err)
  }
}

// ── Cache delete ──────────────────────────────────────────────────
export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch (err) {
    console.warn("[CACHE DEL]", err instanceof Error ? err.message : err)
  }
}