'use client'

import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

/**
 * Segment-level error boundary. Catches errors thrown while rendering pages in
 * the app tree and shows a recoverable fallback (keeping the root layout),
 * instead of bubbling up to the global error boundary.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground max-w-md">
          An unexpected error occurred while loading this page.
        </p>
        {error.digest && (
          <p className="text-muted-foreground/70 text-xs">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset}>Try again</Button>
    </main>
  )
}
