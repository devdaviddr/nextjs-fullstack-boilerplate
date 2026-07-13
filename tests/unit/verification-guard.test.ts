import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockEnv, isEmailEnabled, findFirst, getCurrentSession } = vi.hoisted(
  () => ({
    mockEnv: {} as Record<string, unknown>,
    isEmailEnabled: vi.fn(),
    findFirst: vi.fn(),
    getCurrentSession: vi.fn(),
  }),
)

vi.mock('@/lib/env', () => ({ env: mockEnv }))
vi.mock('@/lib/email', () => ({ isEmailEnabled }))
vi.mock('@/db', () => ({ db: { query: { users: { findFirst } } } }))
vi.mock('@/lib/auth/session', () => ({ getCurrentSession }))

import { ForbiddenError } from '@/lib/auth/rbac'
import {
  isCurrentUserVerified,
  isEmailVerificationEnforced,
  requireEmailVerifiedIfEnforced,
} from '@/lib/auth/verification-guard'

function setEnv(over: Record<string, unknown>) {
  for (const key of Object.keys(mockEnv)) delete mockEnv[key]
  Object.assign(mockEnv, over)
}

beforeEach(() => {
  setEnv({})
  isEmailEnabled.mockReset()
  findFirst.mockReset()
  getCurrentSession.mockReset()
})

describe('isEmailVerificationEnforced', () => {
  it('is off when the flag is off', () => {
    setEnv({ REQUIRE_EMAIL_VERIFICATION: false })
    isEmailEnabled.mockReturnValue(true)
    expect(isEmailVerificationEnforced()).toBe(false)
  })

  it('is off when email is disabled, even with the flag on (avoids a lockout)', () => {
    setEnv({ REQUIRE_EMAIL_VERIFICATION: true })
    isEmailEnabled.mockReturnValue(false)
    expect(isEmailVerificationEnforced()).toBe(false)
  })

  it('is on only when the flag is on AND email is enabled', () => {
    setEnv({ REQUIRE_EMAIL_VERIFICATION: true })
    isEmailEnabled.mockReturnValue(true)
    expect(isEmailVerificationEnforced()).toBe(true)
  })
})

describe('isCurrentUserVerified', () => {
  it('is false when signed out', async () => {
    getCurrentSession.mockResolvedValue(null)
    expect(await isCurrentUserVerified()).toBe(false)
  })

  it('is false when the user has no email_verified timestamp', async () => {
    getCurrentSession.mockResolvedValue({ user: { email: 'a@b.c' } })
    findFirst.mockResolvedValue({ emailVerified: null })
    expect(await isCurrentUserVerified()).toBe(false)
  })

  it('is true when email_verified is set', async () => {
    getCurrentSession.mockResolvedValue({ user: { email: 'a@b.c' } })
    findFirst.mockResolvedValue({ emailVerified: new Date() })
    expect(await isCurrentUserVerified()).toBe(true)
  })
})

describe('requireEmailVerifiedIfEnforced', () => {
  it('is a no-op when not enforced (even if unverified)', async () => {
    setEnv({ REQUIRE_EMAIL_VERIFICATION: false })
    isEmailEnabled.mockReturnValue(true)
    getCurrentSession.mockResolvedValue({ user: { email: 'a@b.c' } })
    findFirst.mockResolvedValue({ emailVerified: null })
    await expect(requireEmailVerifiedIfEnforced()).resolves.toBeUndefined()
  })

  it('throws ForbiddenError when enforced and unverified', async () => {
    setEnv({ REQUIRE_EMAIL_VERIFICATION: true })
    isEmailEnabled.mockReturnValue(true)
    getCurrentSession.mockResolvedValue({ user: { email: 'a@b.c' } })
    findFirst.mockResolvedValue({ emailVerified: null })
    await expect(requireEmailVerifiedIfEnforced()).rejects.toBeInstanceOf(
      ForbiddenError,
    )
  })

  it('passes when enforced and verified', async () => {
    setEnv({ REQUIRE_EMAIL_VERIFICATION: true })
    isEmailEnabled.mockReturnValue(true)
    getCurrentSession.mockResolvedValue({ user: { email: 'a@b.c' } })
    findFirst.mockResolvedValue({ emailVerified: new Date() })
    await expect(requireEmailVerifiedIfEnforced()).resolves.toBeUndefined()
  })
})
