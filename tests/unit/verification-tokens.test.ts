import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted so the mock factory can reference them.
const { insertValues, deleteWhere, selectRows } = vi.hoisted(() => ({
  insertValues: vi.fn().mockResolvedValue(undefined),
  deleteWhere: vi.fn().mockResolvedValue(undefined),
  selectRows: [] as Array<{ expires: Date }>,
}))

vi.mock('@/db', () => ({
  db: {
    delete: () => ({ where: deleteWhere }),
    insert: () => ({ values: insertValues }),
    select: () => ({
      from: () => ({ where: () => Promise.resolve(selectRows) }),
    }),
  },
}))

import { hashToken } from '@/lib/auth/tokens'
import {
  consumeVerificationToken,
  issueVerificationToken,
} from '@/lib/auth/verification-tokens'

beforeEach(() => {
  insertValues.mockClear()
  deleteWhere.mockClear()
  selectRows.length = 0
})

describe('issueVerificationToken', () => {
  it('clears prior tokens of the same purpose, then stores only the HASH', async () => {
    const raw = await issueVerificationToken(
      'user@x.com',
      'password-reset',
      1000,
    )

    // Cleared existing tokens for this identifier+purpose first.
    expect(deleteWhere).toHaveBeenCalledTimes(1)

    // Inserted a row whose stored `token` is the hash of the raw token — never
    // the raw value (a DB leak must not be replayable).
    expect(insertValues).toHaveBeenCalledTimes(1)
    const row = insertValues.mock.calls[0]![0] as {
      identifier: string
      token: string
      purpose: string
    }
    expect(row.identifier).toBe('user@x.com')
    expect(row.purpose).toBe('password-reset')
    expect(row.token).toBe(hashToken(raw))
    expect(row.token).not.toBe(raw)
  })
})

describe('consumeVerificationToken', () => {
  it('accepts a valid, unexpired token and deletes it (single-use)', async () => {
    selectRows.push({ expires: new Date(Date.now() + 60_000) })

    const ok = await consumeVerificationToken(
      'user@x.com',
      'raw',
      'password-reset',
    )

    expect(ok).toBe(true)
    expect(deleteWhere).toHaveBeenCalledTimes(1) // consumed
  })

  it('rejects an expired token but still deletes it (no retry)', async () => {
    selectRows.push({ expires: new Date(Date.now() - 1000) })

    const ok = await consumeVerificationToken(
      'user@x.com',
      'raw',
      'password-reset',
    )

    expect(ok).toBe(false)
    expect(deleteWhere).toHaveBeenCalledTimes(1) // still consumed
  })

  it('returns false and deletes nothing when no matching token exists', async () => {
    // Empty selectRows models a hash/identifier/purpose mismatch — e.g. a
    // reset token presented to the verify flow (purpose is in the WHERE clause).
    const ok = await consumeVerificationToken(
      'user@x.com',
      'raw',
      'email-verify',
    )

    expect(ok).toBe(false)
    expect(deleteWhere).not.toHaveBeenCalled()
  })
})
