'use server'

import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { pushSubscriptions } from '@/db/schema'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { UPLOAD_LIMITS, rateLimit } from '@/lib/rate-limit'

export type PushActionResult = { ok: true } | { ok: false; error: string }

/** Shape produced by the browser's `PushSubscription.toJSON()`. */
export interface SerializedPushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/**
 * Persist a browser push subscription for the signed-in user. Upserts on the
 * unique endpoint so re-subscribing (or a key rotation) updates in place rather
 * than erroring. Rate-limited like other mutating actions.
 */
export async function saveSubscription(
  sub: SerializedPushSubscription,
): Promise<PushActionResult> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, error: 'You are not signed in.' }

  const limited = rateLimit(
    `push-sub:${userId}`,
    UPLOAD_LIMITS.upload.limit,
    UPLOAD_LIMITS.upload.windowMs,
  )
  if (!limited.success) {
    return { ok: false, error: 'Too many attempts. Please wait a moment.' }
  }

  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { ok: false, error: 'Invalid subscription.' }
  }

  await db
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    })
    // An endpoint may already exist (e.g. it was tied to another account on a
    // shared browser) — reassign it to the current user and refresh its keys.
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    })

  logger.debug('Saved push subscription', { userId })
  return { ok: true }
}

/**
 * Remove a subscription. Ownership-checked: only a row belonging to the current
 * user AND matching the endpoint is deleted, so one user can't delete another's.
 */
export async function removeSubscription(
  endpoint: string,
): Promise<PushActionResult> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, error: 'You are not signed in.' }

  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.endpoint, endpoint),
        eq(pushSubscriptions.userId, userId),
      ),
    )

  return { ok: true }
}
