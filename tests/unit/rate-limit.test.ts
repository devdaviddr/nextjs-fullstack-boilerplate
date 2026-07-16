import { beforeEach, describe, expect, it } from 'vitest'

import { AUTH_LIMITS, rateLimit, resetRateLimit } from '@/lib/rate-limit'

describe('rateLimit', () => {
  beforeEach(() => resetRateLimit())

  it('allows requests up to the limit, then blocks', () => {
    const key = 'test:allow'
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 1000).success).toBe(true)
    }
    expect(rateLimit(key, 3, 1000).success).toBe(false)
  })

  it('resets once the window elapses', () => {
    const key = 'test:reset'
    const t0 = 1_000_000
    expect(rateLimit(key, 1, 1000, t0).success).toBe(true)
    expect(rateLimit(key, 1, 1000, t0).success).toBe(false)
    expect(rateLimit(key, 1, 1000, t0 + 1001).success).toBe(true)
  })

  it('tracks keys independently', () => {
    expect(rateLimit('a', 1, 1000).success).toBe(true)
    expect(rateLimit('b', 1, 1000).success).toBe(true)
    expect(rateLimit('a', 1, 1000).success).toBe(false)
  })

  it('reports remaining budget', () => {
    expect(rateLimit('c', 5, 1000).remaining).toBe(4)
    expect(rateLimit('c', 5, 1000).remaining).toBe(3)
  })

  describe('global per-IP login cap (credential stuffing)', () => {
    const { limit, windowMs } = AUTH_LIMITS.loginPerIp

    it('blocks an IP spraying attempts across many accounts', () => {
      const ip = '203.0.113.7'
      // Each attempt targets a DIFFERENT email, so no per-account bucket ever
      // trips — only the global per-IP bucket can stop this.
      for (let i = 0; i < limit; i++) {
        const perAccount = rateLimit(
          `authz:${ip}:user${i}@example.com`,
          AUTH_LIMITS.login.limit,
          AUTH_LIMITS.login.windowMs,
        )
        const perIp = rateLimit(`authz-ip:${ip}`, limit, windowMs)
        expect(perAccount.success && perIp.success).toBe(true)
      }
      expect(rateLimit(`authz-ip:${ip}`, limit, windowMs).success).toBe(false)
    })

    it('does not couple distinct source IPs', () => {
      for (let i = 0; i < limit; i++) {
        rateLimit('authz-ip:198.51.100.1', limit, windowMs)
      }
      expect(rateLimit('authz-ip:198.51.100.1', limit, windowMs).success).toBe(
        false,
      )
      expect(rateLimit('authz-ip:198.51.100.2', limit, windowMs).success).toBe(
        true,
      )
    })

    it('is generous enough for a shared NAT mistyping passwords', () => {
      // A handful of users behind one IP retrying a few times each must not
      // get locked out by the global cap.
      expect(limit).toBeGreaterThanOrEqual(
        AUTH_LIMITS.login.limit * 5, // ≥ 5 users' worth of full retries
      )
    })
  })
})
