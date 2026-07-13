'use client'

import { useActionState } from 'react'

import { FieldError, FormMessage } from '@/components/auth/field-error'
import { SubmitButton } from '@/components/auth/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { initialAuthState } from '@/lib/auth/form-state'
import { resetPassword } from '@/lib/auth/recovery-actions'

export function ResetPasswordForm({
  email,
  token,
}: {
  email: string
  token: string
}) {
  const [state, formAction] = useActionState(resetPassword, initialAuthState)

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage message={state.message} />
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={!!state.fieldErrors?.password}
        />
        <FieldError errors={state.fieldErrors?.password} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={!!state.fieldErrors?.confirmPassword}
        />
        <FieldError errors={state.fieldErrors?.confirmPassword} />
      </div>

      <SubmitButton>Set new password</SubmitButton>
    </form>
  )
}
