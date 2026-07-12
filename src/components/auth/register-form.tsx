'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { FieldError, FormMessage } from '@/components/auth/field-error'
import { SubmitButton } from '@/components/auth/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registerAction } from '@/lib/auth/actions'
import { initialAuthState } from '@/lib/auth/form-state'

export function RegisterForm({
  invite,
  defaultEmail,
}: {
  invite?: string
  defaultEmail?: string
}) {
  const [state, formAction] = useActionState(registerAction, initialAuthState)
  const isInvite = !!invite

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {invite && <input type="hidden" name="invite" value={invite} />}
      <FormMessage message={state.message} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Ada Lovelace"
          required
          aria-invalid={!!state.fieldErrors?.name}
        />
        <FieldError errors={state.fieldErrors?.name} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={defaultEmail}
          readOnly={isInvite && !!defaultEmail}
          required
          aria-invalid={!!state.fieldErrors?.email}
        />
        <FieldError errors={state.fieldErrors?.email} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
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
        <Label htmlFor="confirmPassword">Confirm password</Label>
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

      <SubmitButton>Create account</SubmitButton>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-foreground underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
