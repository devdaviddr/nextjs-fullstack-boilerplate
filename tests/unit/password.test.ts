import { describe, expect, it } from 'vitest'

import {
  fakeVerifyPassword,
  hashPassword,
  verifyPassword,
} from '@/lib/auth/password'

describe('password hashing', () => {
  it('produces an argon2id hash distinct from the input', async () => {
    const hash = await hashPassword('Password123')
    expect(hash).toMatch(/^\$argon2id\$/)
    expect(hash).not.toContain('Password123')
  })

  it('produces a unique salt per hash', async () => {
    const [a, b] = await Promise.all([
      hashPassword('Password123'),
      hashPassword('Password123'),
    ])
    expect(a).not.toEqual(b)
  })

  it('verifies a correct password', async () => {
    const hash = await hashPassword('Password123')
    await expect(verifyPassword(hash, 'Password123')).resolves.toBe(true)
  })

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('Password123')
    await expect(verifyPassword(hash, 'wrong-password')).resolves.toBe(false)
  })

  it('returns false for a malformed hash instead of throwing', async () => {
    await expect(verifyPassword('not-a-hash', 'anything')).resolves.toBe(false)
  })

  it('fakeVerifyPassword always resolves false', async () => {
    await expect(fakeVerifyPassword('anything')).resolves.toBe(false)
  })
})
