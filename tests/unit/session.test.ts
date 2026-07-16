import { beforeEach, describe, expect, it, vi } from 'vitest'

// getCurrentSession must treat an undecryptable cookie as signed-out (null)
// but re-throw genuine failures and Next.js control-flow signals.

const mockAuth = vi.fn()
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}))

const mockWarn = vi.fn()
vi.mock('@/lib/logger', () => ({
  logger: { warn: (...args: unknown[]) => mockWarn(...args) },
}))

// Mirror the real behavior we rely on: control-flow errors (digest NEXT_*)
// are re-thrown, everything else passes through untouched.
vi.mock('next/navigation', () => ({
  unstable_rethrow: (error: unknown) => {
    const digest = (error as { digest?: unknown } | null)?.digest
    if (typeof digest === 'string' && digest.startsWith('NEXT_')) {
      throw error
    }
  },
}))

import { getCurrentSession } from '@/lib/auth/session'

describe('getCurrentSession', () => {
  beforeEach(() => {
    mockAuth.mockReset()
    mockWarn.mockReset()
  })

  it('returns the session when auth() succeeds', async () => {
    const session = { user: { id: 'u1' } }
    mockAuth.mockResolvedValue(session)
    await expect(getCurrentSession()).resolves.toBe(session)
  })

  it('treats a JWTSessionError as signed-out (null) and warns', async () => {
    const err = new Error('no matching decryption secret')
    err.name = 'JWTSessionError'
    mockAuth.mockRejectedValue(err)
    await expect(getCurrentSession()).resolves.toBeNull()
    expect(mockWarn).toHaveBeenCalledOnce()
  })

  it('treats decrypt-flavoured messages as signed-out', async () => {
    mockAuth.mockRejectedValue(new Error('JWE decryption failed'))
    await expect(getCurrentSession()).resolves.toBeNull()
  })

  it('treats a decrypt-flavoured cause as signed-out', async () => {
    const err = new Error('session error')
    err.cause = new Error('decryption operation failed')
    mockAuth.mockRejectedValue(err)
    await expect(getCurrentSession()).resolves.toBeNull()
  })

  it('re-throws genuine unexpected failures (e.g. DB outage)', async () => {
    mockAuth.mockRejectedValue(new Error('connection refused'))
    await expect(getCurrentSession()).rejects.toThrow('connection refused')
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('re-throws Next.js control-flow signals instead of swallowing them', async () => {
    const redirect = new Error('NEXT_REDIRECT') as Error & { digest: string }
    redirect.digest = 'NEXT_REDIRECT;replace;/login'
    mockAuth.mockRejectedValue(redirect)
    await expect(getCurrentSession()).rejects.toBe(redirect)
  })

  it('re-throws non-Error rejections', async () => {
    mockAuth.mockRejectedValue('boom')
    await expect(getCurrentSession()).rejects.toBe('boom')
  })
})
