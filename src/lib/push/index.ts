import 'server-only'

import { eq, inArray } from 'drizzle-orm'
import webpush from 'web-push'

import { db } from '@/db'
import { pushSubscriptions, roles, userRoles } from '@/db/schema'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

export interface PushPayload {
  title: string
  body: string
  /** Where clicking the notification should take the user (app-relative). */
  url?: string
}

/**
 * Push is only "on" when all three VAPID vars are configured. Like
 * `isEmailEnabled()`, callers don't branch on config themselves — the send
 * helpers are safe no-ops when this is false.
 */
export function isPushEnabled(): boolean {
  return Boolean(
    env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT,
  )
}

/** The VAPID public key — safe to expose to the client (used to subscribe). */
export function getVapidPublicKey(): string | null {
  return env.VAPID_PUBLIC_KEY ?? null
}

let configured = false
function ensureConfigured(): boolean {
  if (!isPushEnabled()) return false
  if (!configured) {
    webpush.setVapidDetails(
      env.VAPID_SUBJECT!,
      env.VAPID_PUBLIC_KEY!,
      env.VAPID_PRIVATE_KEY!,
    )
    configured = true
  }
  return true
}

/**
 * Send a push to every subscription for `userId`. Best-effort and non-blocking
 * for the caller (never throws — mirrors `sendEmail`). Subscriptions the push
 * service reports as gone (HTTP 404/410) are pruned inline, so dead rows never
 * accumulate.
 *
 * NOTE: payloads may be visible on a lock screen — do not include sensitive
 * content.
 */
export async function sendPushNotification(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!ensureConfigured()) return

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        )
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, sub.id))
          logger.debug('Pruned expired push subscription', { id: sub.id })
        } else {
          logger.error('Push send failed', {
            error: String(err),
            subscriptionId: sub.id,
          })
        }
      }
    }),
  )
}

/**
 * Send a push to every user holding `roleName`. Used by the worked example
 * (notify admins on new registration). Best-effort, like `sendPushNotification`.
 */
export async function notifyRole(
  roleName: string,
  payload: PushPayload,
): Promise<void> {
  if (!ensureConfigured()) return

  const role = await db.query.roles.findFirst({
    where: eq(roles.name, roleName),
    columns: { id: true },
  })
  if (!role) return

  const rows = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(inArray(userRoles.roleId, [role.id]))

  await Promise.all(rows.map((r) => sendPushNotification(r.userId, payload)))
}
