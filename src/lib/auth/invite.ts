import 'server-only'

import { createToken, hashToken, verifyToken } from './tokens'

/** How long an invite link stays valid. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Mint a single-use invite token. The raw `token` is shown to the admin ONCE
 * (put in the invite link); only its `tokenHash` is stored, so a database leak
 * can't be used to claim accounts. Thin wrapper over the shared token
 * primitive (`tokens.ts`), fixed to the invite TTL.
 */
export function createInviteToken() {
  return createToken(INVITE_TTL_MS)
}

export function hashInviteToken(token: string): string {
  return hashToken(token)
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
  return verifyToken(token, storedHash, expires)
}
