import 'server-only'

import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { users } from '@/db/schema'
import {
  consumeVerificationToken,
  EMAIL_VERIFY_TTL_MS,
  issueVerificationToken,
} from '@/lib/auth/verification-tokens'
import { isEmailEnabled, sendEmail } from '@/lib/email'
import { verifyEmail } from '@/lib/email/templates'
import { env } from '@/lib/env'

// Internal helpers (NOT server actions) so they can't be POSTed to directly —
// e.g. `sendVerificationEmail` must not be a public endpoint that anyone could
// use to spam an address.

function verifyLink(token: string, email: string): string {
  const url = new URL('/verify-email', env.APP_URL)
  url.searchParams.set('token', token)
  url.searchParams.set('email', email)
  return url.toString()
}

/**
 * Send a verification email. Safe no-op when email is off. Callers await it but
 * should not let a send failure abort their own work (registration still
 * succeeds even if the mail bounces).
 */
export async function sendVerificationEmail(email: string): Promise<void> {
  if (!isEmailEnabled()) return
  const token = await issueVerificationToken(
    email,
    'email-verify',
    EMAIL_VERIFY_TTL_MS,
  )
  await sendEmail(verifyEmail({ to: email, url: verifyLink(token, email) }))
}

/**
 * Confirm an email-verification token. Returns whether it was valid; on success
 * marks the user verified. Called from the /verify-email page.
 */
export async function confirmEmailToken(
  email: string,
  token: string,
): Promise<boolean> {
  const valid = await consumeVerificationToken(email, token, 'email-verify')
  if (!valid) return false
  await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.email, email))
  return true
}
