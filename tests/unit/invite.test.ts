import { describe, expect, it } from 'vitest'

import {
  createInviteToken,
  hashInviteToken,
  verifyInviteToken,
} from '@/lib/auth/invite'

describe('invite tokens', () => {
  it('mints a token whose stored hash matches', () => {
    const { token, tokenHash, expires } = createInviteToken()
    expect(token).toHaveLength(43) // 32 bytes base64url
    expect(tokenHash).toBe(hashInviteToken(token))
    expect(expires.getTime()).toBeGreaterThan(Date.now())
  })

  it('verifies a correct, unexpired token', () => {
    const { token, tokenHash, expires } = createInviteToken()
    expect(verifyInviteToken(token, tokenHash, expires)).toBe(true)
  })

  it('rejects a wrong token, expired token, or missing input', () => {
    const { token, tokenHash } = createInviteToken()
    expect(verifyInviteToken('wrong', tokenHash, null)).toBe(false)
    expect(
      verifyInviteToken(token, tokenHash, new Date(Date.now() - 1000)),
    ).toBe(false)
    expect(verifyInviteToken(undefined, tokenHash, null)).toBe(false)
    expect(verifyInviteToken(token, null, null)).toBe(false)
  })
})
