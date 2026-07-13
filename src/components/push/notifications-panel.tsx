'use client'

import { Bell, BellOff } from 'lucide-react'
import { useEffect, useState } from 'react'

import { removeSubscription, saveSubscription } from '@/lib/push/actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/** VAPID public key (base64url) → bytes for `applicationServerKey`. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

/**
 * "Enable notifications" toggle. Only rendered when the deployment has VAPID
 * keys configured (the Settings page passes the public key). Requests browser
 * permission, subscribes via the service worker's PushManager, and persists the
 * subscription server-side; disabling unsubscribes and deletes the row.
 */
export function NotificationsPanel({ publicKey }: { publicKey: string }) {
  const [supported, setSupported] = useState(true)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // Support detection + the current-subscription check both run client-only,
    // inside this async closure (so state isn't set synchronously in the effect
    // body). Guarded by `cancelled` against an unmount mid-flight.
    void (async () => {
      const ok =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
      if (cancelled) return
      setSupported(ok)
      if (!ok) return
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (!cancelled) setSubscribed(Boolean(sub))
      } catch {
        /* no service worker (e.g. dev) — leave as not-subscribed */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function enable() {
    setBusy(true)
    setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setError('Notification permission was not granted.')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
      const json = sub.toJSON()
      const res = await saveSubscription({
        endpoint: json.endpoint ?? '',
        keys: {
          p256dh: json.keys?.p256dh ?? '',
          auth: json.keys?.auth ?? '',
        },
      })
      if (!res.ok) {
        await sub.unsubscribe()
        setError(res.error)
        return
      }
      setSubscribed(true)
    } catch {
      setError('Could not enable notifications on this device.')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    setError(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await removeSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch {
      setError('Could not disable notifications.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </CardTitle>
        <CardDescription>
          Get push notifications on this device, even when the app is closed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!supported ? (
          <p className="text-muted-foreground text-sm">
            This browser doesn&apos;t support push notifications, or the app
            isn&apos;t installed as a PWA (push is only active in production).
          </p>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm">
              {subscribed
                ? 'Notifications are enabled on this device.'
                : 'Notifications are off on this device.'}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={subscribed ? disable : enable}
            >
              {subscribed ? <BellOff /> : <Bell />}
              {subscribed ? 'Disable' : 'Enable'}
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
