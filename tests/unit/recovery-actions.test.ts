import { beforeEach, describe, expect, it, vi } from 'vitest'

// Isolate requestPasswordReset's early branches. Its heavy module-level imports
// (auth/index, db, argon2, token store) are mocked so the module loads without
// a DB or native crypto; the FR6 branch returns before touching any of them.
const { isEmailEnabled } = vi.hoisted(() => ({ isEmailEnabled: vi.fn() }))

vi.mock('@/lib/email', () => ({ isEmailEnabled, sendEmail: vi.fn() }))
vi.mock('@/db', () => ({ db: {} }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(), signIn: vi.fn() }))
vi.mock('@/lib/auth/email-verification', () => ({
  sendVerificationEmail: vi.fn(),
}))
vi.mock('@/lib/auth/password', () => ({ hashPassword: vi.fn() }))
vi.mock('@/lib/auth/verification-tokens', () => ({
  consumeVerificationToken: vi.fn(),
  issueVerificationToken: vi.fn(),
  PASSWORD_RESET_TTL_MS: 3_600_000,
}))
vi.mock('@/lib/env', () => ({ env: { APP_URL: 'http://localhost:3000' } }))

import { requestPasswordReset } from '@/lib/auth/recovery-actions'

function form(email: string): FormData {
  const fd = new FormData()
  fd.set('email', email)
  return fd
}

beforeEach(() => isEmailEnabled.mockReset())

describe('requestPasswordReset', () => {
  it('tells the user to contact an admin when email is disabled (FR6)', async () => {
    isEmailEnabled.mockReturnValue(false)
    const result = await requestPasswordReset(
      { status: 'idle' },
      form('someone@example.com'),
    )
    expect(result.status).toBe('error')
    expect(result.message).toMatch(/isn't configured/i)
  })

  it('rejects an invalid email before doing anything', async () => {
    isEmailEnabled.mockReturnValue(true)
    const result = await requestPasswordReset({ status: 'idle' }, form('nope'))
    expect(result.status).toBe('error')
    expect(result.fieldErrors?.email).toBeTruthy()
  })
})
