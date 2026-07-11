/**
 * Minimal in-memory rate limiter (fixed window).
 *
 * Good enough for a single instance. For serverless or multi-instance
 * deployments, swap the store for a shared backend such as
 * `@upstash/ratelimit` — keep the `rateLimit()` signature and only the storage
 * changes.
 *
 * NOTE: this limits per key. `authRateLimit` keys login attempts by IP+email
 * (per-account brute force) and registrations by IP. A global per-IP login cap
 * to blunt credential stuffing across many accounts is a good next step (do it
 * in the shared-store version).
 */
export interface RateLimitResult {
  success: boolean
  remaining: number
  /** Epoch ms when the current window resets. */
  resetAt: number
}

interface Bucket {
  count: number
  resetAt: number
}

const store = new Map<string, Bucket>()

export const AUTH_LIMITS = {
  login: { limit: 8, windowMs: 10 * 60_000 },
  register: { limit: 20, windowMs: 10 * 60_000 },
} as const

/** Disable in environments (e.g. certain test runs) via env. */
const DISABLED = process.env.RATE_LIMIT_DISABLED === 'true'

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  if (DISABLED)
    return { success: true, remaining: limit, resetAt: now + windowMs }

  const existing = store.get(key)

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    // Opportunistic cleanup so the map can't grow unbounded.
    if (store.size > 10_000) {
      for (const [k, v] of store) if (v.resetAt <= now) store.delete(k)
    }
    return { success: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (existing.count >= limit) {
    return { success: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count += 1
  return {
    success: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  }
}

/** Test helper — clear one key or the whole store. */
export function resetRateLimit(key?: string): void {
  if (key) store.delete(key)
  else store.clear()
}
