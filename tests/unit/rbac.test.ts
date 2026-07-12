import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetSession = vi.fn()
vi.mock('@/lib/auth/session', () => ({
  getCurrentSession: () => mockGetSession(),
}))

import {
  ForbiddenError,
  hasRole,
  requireAnyRole,
  requireRole,
} from '@/lib/auth/rbac'

const session = (roles?: string[]) =>
  roles ? { user: { id: 'u1', roles } } : null

describe('rbac', () => {
  beforeEach(() => mockGetSession.mockReset())

  it('hasRole is true when the user has an allowed role', async () => {
    mockGetSession.mockResolvedValue(session(['admin']))
    expect(await hasRole('admin')).toBe(true)
    expect(await hasRole('member', 'admin')).toBe(true)
  })

  it('hasRole is false without the role or without a session', async () => {
    mockGetSession.mockResolvedValue(session(['member']))
    expect(await hasRole('admin')).toBe(false)
    mockGetSession.mockResolvedValue(null)
    expect(await hasRole('admin')).toBe(false)
  })

  it('requireRole resolves for an allowed role, throws otherwise', async () => {
    mockGetSession.mockResolvedValue(session(['admin']))
    await expect(requireRole('admin')).resolves.toBeUndefined()

    mockGetSession.mockResolvedValue(session(['member']))
    await expect(requireRole('admin')).rejects.toBeInstanceOf(ForbiddenError)

    mockGetSession.mockResolvedValue(null)
    await expect(requireRole('admin')).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('requireAnyRole returns the matched role or throws', async () => {
    mockGetSession.mockResolvedValue(session(['member']))
    expect(await requireAnyRole('admin', 'member')).toBe('member')

    mockGetSession.mockResolvedValue(session(['viewer']))
    await expect(requireAnyRole('admin', 'member')).rejects.toBeInstanceOf(
      ForbiddenError,
    )
  })
})
