import 'server-only'

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** How long an invite link stays valid. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Mint a single-use invite token. The raw `token` is shown to the admin ONCE
 * (put in the invite link); only its `tokenHash` is stored, so a database leak
 * can't be used to claim accounts.
 */
export function createInviteToken() {
  const token = randomBytes(32).toString('base64url')
  return {
    token,
    tokenHash: hashInviteToken(token),
    expires: new Date(Date.now() + INVITE_TTL_MS),
  }
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Constant-time check that a presented token matches the stored hash and hasn't
 * expired. Returns false for any missing/expired/mismatched input.
 */
export function verifyInviteToken(
  token: string | undefined | null,
  storedHash: string | null,
  expires: Date | null,
): boolean {
  if (!token || !storedHash) return false
  if (expires && expires.getTime() < Date.now()) return false
  const presented = Buffer.from(hashInviteToken(token))
  const stored = Buffer.from(storedHash)
  return (
    presented.length === stored.length && timingSafeEqual(presented, stored)
  )
}
