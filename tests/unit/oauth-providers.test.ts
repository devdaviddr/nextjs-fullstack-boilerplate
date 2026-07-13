import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted so the vi.mock factory can reference it.
const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {} as Record<string, unknown>,
}))

vi.mock('@/lib/env', () => ({ env: mockEnv }))

import {
  configuredOAuthProviders,
  isGithubConfigured,
  isGoogleConfigured,
} from '@/lib/auth/providers'

function setEnv(over: Record<string, unknown>) {
  for (const key of Object.keys(mockEnv)) delete mockEnv[key]
  Object.assign(mockEnv, over)
}

describe('OAuth provider configuration', () => {
  beforeEach(() => setEnv({}))

  it('treats a provider as unconfigured when neither id nor secret is set', () => {
    expect(isGithubConfigured()).toBe(false)
    expect(isGoogleConfigured()).toBe(false)
    expect(configuredOAuthProviders()).toEqual([])
  })

  it('requires BOTH id and secret — one alone is not enough', () => {
    setEnv({ AUTH_GITHUB_ID: 'id-only' })
    expect(isGithubConfigured()).toBe(false)

    setEnv({ AUTH_GITHUB_SECRET: 'secret-only' })
    expect(isGithubConfigured()).toBe(false)
  })

  it('enables a provider when both id and secret are present', () => {
    setEnv({ AUTH_GITHUB_ID: 'gh-id', AUTH_GITHUB_SECRET: 'gh-secret' })
    expect(isGithubConfigured()).toBe(true)
    expect(isGoogleConfigured()).toBe(false)
    expect(configuredOAuthProviders()).toEqual(['github'])
  })

  it('lists multiple configured providers in a stable order', () => {
    setEnv({
      AUTH_GITHUB_ID: 'gh-id',
      AUTH_GITHUB_SECRET: 'gh-secret',
      AUTH_GOOGLE_ID: 'go-id',
      AUTH_GOOGLE_SECRET: 'go-secret',
    })
    expect(configuredOAuthProviders()).toEqual(['github', 'google'])
  })
})
