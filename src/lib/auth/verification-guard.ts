import 'server-only'

import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { users } from '@/db/schema'
import { isEmailEnabled } from '@/lib/email'
import { env } from '@/lib/env'
import { ForbiddenError } from './rbac'
import { getCurrentSession } from './session'

/**
 * Whether unverified users should be soft-gated. Only meaningful when email is
 * actually configured — otherwise no one could ever verify, so the flag is
 * ignored rather than locking everyone out.
 */
export function isEmailVerificationEnforced(): boolean {
  return Boolean(env.REQUIRE_EMAIL_VERIFICATION && isEmailEnabled())
}

/**
 * The current user's verified state. The JWT doesn't carry `emailVerified`
 * (it can change without a re-login), so this reads it fresh from the DB.
 */
export async function isCurrentUserVerified(): Promise<boolean> {
  const session = await getCurrentSession()
  const email = session?.user?.email
  if (!email) return false
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { emailVerified: true },
  })
  return Boolean(user?.emailVerified)
}

/**
 * Soft gate: throw when verification is enforced and the current user hasn't
 * verified. Called at the top of privileged (admin) mutations — it does NOT
 * gate the whole app, only the actions that opt in.
 */
export async function requireEmailVerifiedIfEnforced(): Promise<void> {
  if (!isEmailVerificationEnforced()) return
  if (!(await isCurrentUserVerified())) {
    throw new ForbiddenError('Please verify your email to perform this action.')
  }
}
