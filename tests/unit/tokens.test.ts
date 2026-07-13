import { describe, expect, it } from 'vitest'

import { createToken, hashToken, verifyToken } from '@/lib/auth/tokens'

describe('single-use token primitive', () => {
  it('stores only the hash, never the raw token', () => {
    const { token, tokenHash } = createToken(1000)
    expect(tokenHash).toBe(hashToken(token))
    expect(tokenHash).not.toBe(token)
  })

  it('sets expiry from the given TTL', () => {
    const before = Date.now()
    const { expires } = createToken(60_000)
    expect(expires.getTime()).toBeGreaterThanOrEqual(before + 60_000)
    expect(expires.getTime()).toBeLessThanOrEqual(Date.now() + 60_000)
  })

  it('verifies a matching, unexpired token', () => {
    const { token, tokenHash, expires } = createToken(60_000)
    expect(verifyToken(token, tokenHash, expires)).toBe(true)
  })

  it('rejects a wrong token, expired token, and missing inputs', () => {
    const { token, tokenHash } = createToken(60_000)
    expect(verifyToken('wrong', tokenHash, null)).toBe(false)
    expect(verifyToken(token, tokenHash, new Date(Date.now() - 1000))).toBe(
      false,
    )
    expect(verifyToken(undefined, tokenHash, null)).toBe(false)
    expect(verifyToken(token, null, null)).toBe(false)
  })

  it('is constant-time-safe against length-mismatched hashes', () => {
    const { token } = createToken(60_000)
    // A truncated stored hash must not throw and must not match.
    expect(verifyToken(token, 'abc', null)).toBe(false)
  })
})
