'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { FieldError, FormMessage } from '@/components/auth/field-error'
import { SubmitButton } from '@/components/auth/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginAction } from '@/lib/auth/actions'
import { initialAuthState } from '@/lib/auth/form-state'

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialAuthState)

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
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

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-muted-foreground hover:text-foreground text-xs underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={!!state.fieldErrors?.password}
        />
        <FieldError errors={state.fieldErrors?.password} />
      </div>

      <SubmitButton>Sign in</SubmitButton>

      <p className="text-muted-foreground text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-foreground underline">
          Create one
        </Link>
      </p>
    </form>
  )
}
