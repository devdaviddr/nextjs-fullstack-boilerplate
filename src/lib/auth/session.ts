import 'server-only'

import { unstable_rethrow } from 'next/navigation'

import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'

/**
 * True when the error is Auth.js failing to decode/verify the session cookie —
 * which happens legitimately when `AUTH_SECRET` is rotated and a client still
 * holds a cookie signed with the old secret. Such a cookie means "not signed
 * in", not "something is broken".
 */
function isSessionDecodeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const cause = error.cause instanceof Error ? error.cause.message : ''
  return (
    error.name === 'JWTSessionError' ||
    /decrypt|decryption|jwe|jwt/i.test(error.message) ||
    /decrypt|decryption/i.test(cause)
  )
}

/**
 * Resilient session accessor for server components.
 *
 * An undecryptable cookie is treated as signed-out (returns null). Genuine,
 * unexpected failures (e.g. a database outage) are re-thrown so they surface in
 * an error boundary and monitoring instead of silently logging users out.
 */
export async function getCurrentSession() {
  try {
    return await auth()
  } catch (error) {
    // Re-throw Next.js control-flow signals (redirect, notFound, dynamic-usage
    // bailout) — swallowing them breaks routing and static/dynamic detection.
    unstable_rethrow(error)

    if (isSessionDecodeError(error)) {
      logger.warn('Session cookie could not be decoded; treating as signed-out')
      return null
    }
    throw error
  }
}
