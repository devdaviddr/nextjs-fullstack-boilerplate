import 'server-only'

import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { verificationTokens } from '@/db/schema'
import { createToken, hashToken } from './tokens'

export type TokenPurpose = 'password-reset' | 'email-verify'

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000 // 1 hour
export const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Issue a purpose-scoped, single-use token for `identifier` (the user's email).
 * Any existing token of the same purpose is cleared first, so only the latest
 * link works. Returns the RAW token for the email link; only its hash is
 * stored.
 */
export async function issueVerificationToken(
  identifier: string,
  purpose: TokenPurpose,
  ttlMs: number,
): Promise<string> {
  const { token, tokenHash, expires } = createToken(ttlMs)

  await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, identifier),
        eq(verificationTokens.purpose, purpose),
      ),
    )

  await db
    .insert(verificationTokens)
    .values({ identifier, token: tokenHash, expires, purpose })

  return token
}

/**
 * Validate and consume a token. Looks it up by (identifier, hash, purpose),
 * deletes it (single-use — even if expired, so it can't be retried), and
 * returns whether it was valid and unexpired. The `purpose` scoping means a
 * reset token presented to the verify flow (or vice versa) never matches.
 */
export async function consumeVerificationToken(
  identifier: string,
  rawToken: string,
  purpose: TokenPurpose,
): Promise<boolean> {
  const tokenHash = hashToken(rawToken)

  const [row] = await db
    .select({ expires: verificationTokens.expires })
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, identifier),
        eq(verificationTokens.token, tokenHash),
        eq(verificationTokens.purpose, purpose),
      ),
    )

  if (!row) return false

  await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, identifier),
        eq(verificationTokens.token, tokenHash),
      ),
    )

  return row.expires.getTime() >= Date.now()
}
