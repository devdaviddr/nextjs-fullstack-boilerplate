import 'server-only'

import { unstable_rethrow } from 'next/navigation'

import { auth } from '@/lib/auth'

/**
 * Resilient session accessor for server components.
 *
 * `auth()` throws a `JWTSessionError` when a session cookie cannot be decrypted
 * — which happens legitimately whenever `AUTH_SECRET` is rotated and a client
 * still holds a cookie signed with the old secret. An undecryptable cookie
 * means "not signed in", not "crash the page", so we swallow the error and
 * return null rather than letting it 500 every route that reads the session.
 */
export async function getCurrentSession() {
  try {
    return await auth()
  } catch (error) {
    // Re-throw Next.js control-flow signals (redirect, notFound, dynamic-usage
    // bailout) — swallowing them breaks routing and static/dynamic detection.
    unstable_rethrow(error)
    console.warn(
      '[auth] session could not be decoded — treating request as signed-out. ' +
        'This is expected after an AUTH_SECRET rotation.',
      error,
    )
    return null
  }
}
