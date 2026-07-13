'use client'

import { MailWarning } from 'lucide-react'
import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { initialAuthState } from '@/lib/auth/form-state'
import { resendVerificationEmail } from '@/lib/auth/recovery-actions'

/**
 * Soft-gate banner shown to unverified users when
 * `REQUIRE_EMAIL_VERIFICATION` is on. Informational + a resend action; it never
 * blocks navigation (the block is enforced server-side on admin actions only).
 */
export function VerificationBanner() {
  const [state, action] = useActionState(
    resendVerificationEmail,
    initialAuthState,
  )

  return (
    <div
      role="status"
      className="mb-6 flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:text-amber-200"
    >
      <p className="flex items-center gap-2 text-sm">
        <MailWarning className="size-4 shrink-0" />
        {state.status === 'success'
          ? state.message
          : 'Please verify your email address to unlock all features.'}
      </p>
      {state.status !== 'success' && (
        <form action={action}>
          <Button type="submit" variant="outline" size="sm">
            Resend verification email
          </Button>
        </form>
      )}
    </div>
  )
}
