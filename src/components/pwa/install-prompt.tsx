'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Non-intrusive "install app" affordance. Appears only when the browser fires
 * `beforeinstallprompt` (i.e. the app is installable and not yet installed).
 * iOS Safari doesn't fire this event, so nothing shows there — by design.
 */
export function InstallPrompt() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setPromptEvent(null))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!promptEvent || dismissed) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="bg-background flex w-full max-w-sm items-center gap-3 rounded-xl px-4 py-3 shadow-lg">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Install this app</p>
          <p className="text-muted-foreground truncate text-xs">
            Add to your home screen for a full-screen experience.
          </p>
        </div>
        <Button
          size="sm"
          onClick={async () => {
            await promptEvent.prompt()
            await promptEvent.userChoice
            setPromptEvent(null)
          }}
        >
          <Download />
          Install
        </Button>
        <button
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setDismissed(true)}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
