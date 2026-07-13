import { env } from '@/lib/env'

/**
 * OAuth provider configuration checks — the single source of truth for whether
 * a provider is wired up. A provider is "configured" only when BOTH its client
 * id and secret are present, mirroring the off-by-default posture of
 * `isEmailEnabled()`. These booleans (never the secret values) are what the
 * login page and Settings pass to the client to decide which buttons to show.
 */
export function isGithubConfigured(): boolean {
  return Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET)
}

export function isGoogleConfigured(): boolean {
  return Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET)
}

/** All OAuth providers configured for this deployment, as stable ids. */
export function configuredOAuthProviders(): Array<'github' | 'google'> {
  const list: Array<'github' | 'google'> = []
  if (isGithubConfigured()) list.push('github')
  if (isGoogleConfigured()) list.push('google')
  return list
}
