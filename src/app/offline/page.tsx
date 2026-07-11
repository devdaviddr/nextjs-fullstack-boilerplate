import type { Metadata } from 'next'
import { WifiOff } from 'lucide-react'

export const metadata: Metadata = { title: 'Offline' }

// Served by the service worker as the navigation fallback when the network is
// unavailable. Kept fully static so it works with no connection.
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <WifiOff className="text-muted-foreground size-10" />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
        <p className="text-muted-foreground max-w-sm">
          This page isn&apos;t available without a connection. Reconnect and try
          again.
        </p>
      </div>
    </main>
  )
}
