'use server'

import { and, count, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { db } from '@/db'
import { accounts, users } from '@/db/schema'
import { auth, signIn } from '@/lib/auth'
import { configuredOAuthProviders } from '@/lib/auth/providers'

export type OAuthProvider = 'github' | 'google'

function isProvider(v: unknown): v is OAuthProvider {
  return v === 'github' || v === 'google'
}

export interface LinkedAccountsState {
  /** Providers currently linked to the signed-in user. */
  linked: OAuthProvider[]
  /** Providers this deployment has configured (env vars present). */
  configured: OAuthProvider[]
  /** Whether the user also has a password sign-in method. */
  hasPassword: boolean
}

/** Snapshot of the current user's linked providers + password status. */
export async function getLinkedAccounts(): Promise<LinkedAccountsState> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { linked: [], configured: [], hasPassword: false }

  const rows = await db
    .select({ provider: accounts.provider })
    .from(accounts)
    .where(eq(accounts.userId, userId))

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { hashedPassword: true },
  })

  return {
    linked: rows.map((r) => r.provider).filter(isProvider),
    configured: configuredOAuthProviders(),
    hasPassword: Boolean(user?.hashedPassword),
  }
}

/**
 * Link an additional provider to the signed-in account. `signIn` while
 * authenticated attaches the OAuth account to the current session user, then
 * completes by throwing a redirect back to /settings.
 */
export async function linkProviderAction(formData: FormData) {
  const provider = formData.get('provider')
  if (!isProvider(provider)) return
  await signIn(provider, { redirectTo: '/settings' })
}

export type UnlinkResult = { ok: true } | { ok: false; error: string }

/**
 * Unlink a provider. Blocked server-side if it would leave the account with no
 * password AND no other linked provider — the same self-lockout prevention as
 * the admin self-role-removal guard.
 */
export async function unlinkProviderAction(
  _prev: UnlinkResult | null,
  formData: FormData,
): Promise<UnlinkResult> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, error: 'You are not signed in.' }

  const provider = formData.get('provider')
  if (!isProvider(provider)) return { ok: false, error: 'Unknown provider.' }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { hashedPassword: true },
  })
  const [row] = await db
    .select({ value: count() })
    .from(accounts)
    .where(eq(accounts.userId, userId))
  const accountCount = row?.value ?? 0
  const hasPassword = Boolean(user?.hashedPassword)

  if (!hasPassword && accountCount <= 1) {
    return {
      ok: false,
      error:
        'This is your only sign-in method. Set a password or link another provider before unlinking it.',
    }
  }

  await db
    .delete(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, provider)))

  revalidatePath('/settings')
  return { ok: true }
}
