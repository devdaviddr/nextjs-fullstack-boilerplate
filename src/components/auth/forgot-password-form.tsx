'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { FieldError, FormMessage } from '@/components/auth/field-error'
import { SubmitButton } from '@/components/auth/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { initialAuthState } from '@/lib/auth/form-state'
import { requestPasswordReset } from '@/lib/auth/recovery-actions'

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(
    requestPasswordReset,
    initialAuthState,
  )

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.status === 'success' ? (
        <p
          role="status"
          className="border-primary/30 bg-primary/5 rounded-md border px-3 py-2 text-sm"
        >
          {state.message}
        </p>
      ) : (
        <>
          <FormMessage message={state.message} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              aria-invalid={!!state.fieldErrors?.email}
            />
            <FieldError errors={state.fieldErrors?.email} />
          </div>
          <SubmitButton>Send reset link</SubmitButton>
        </>
      )}

      <p className="text-muted-foreground text-center text-sm">
        Remembered it?{' '}
        <Link href="/login" className="text-foreground underline">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
