import { beforeEach, describe, expect, it } from 'vitest'

import { rateLimit, resetRateLimit } from '@/lib/rate-limit'

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
})
