import 'server-only'

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Purpose-agnostic single-use hashed tokens — the shared primitive behind
 * invite links, password reset, and email verification. The raw `token` is
 * shown/emailed to the user exactly once; only its SHA-256 `tokenHash` is
 * stored, so a database leak can't be replayed. A `purpose` (see
 * `verificationTokens.purpose`) scopes each token so a reset token can't be
 * presented to the verify endpoint and vice versa.
 */
export interface MintedToken {
  /** The raw token — put in the emailed link; never stored. */
  token: string
  /** SHA-256 of the token — this is what gets persisted. */
  tokenHash: string
  expires: Date
}

/** Mint a single-use token that expires `ttlMs` from now. */
export function createToken(ttlMs: number): MintedToken {
  const token = randomBytes(32).toString('base64url')
  return {
    token,
    tokenHash: hashToken(token),
    expires: new Date(Date.now() + ttlMs),
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Constant-time check that a presented token matches the stored hash and hasn't
 * expired. Returns false for any missing/expired/mismatched input.
 */
export function verifyToken(
  token: string | undefined | null,
  storedHash: string | null | undefined,
  expires: Date | null | undefined,
): boolean {
  if (!token || !storedHash) return false
  if (expires && expires.getTime() < Date.now()) return false
  const presented = Buffer.from(hashToken(token))
  const stored = Buffer.from(storedHash)
  return (
    presented.length === stored.length && timingSafeEqual(presented, stored)
  )
}
