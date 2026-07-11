'use server'

import { eq } from 'drizzle-orm'
import { AuthError } from 'next-auth'

import { db } from '@/db'
import { users } from '@/db/schema'
import { signIn } from '@/lib/auth'
import type { AuthFormState } from '@/lib/auth/form-state'
import { hashPassword } from '@/lib/auth/password'
import { loginSchema, registerSchema } from '@/lib/validations/auth'

/**
 * `signIn` with a `redirectTo` succeeds by throwing a Next.js redirect. We must
 * re-throw those (identified by the NEXT_REDIRECT digest) rather than swallow
 * them as auth failures.
 */
function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as { digest: unknown }).digest === 'string' &&
    (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  )
}

function collectFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '_form')
    ;(fieldErrors[key] ??= []).push(issue.message)
  }
  return fieldErrors
}

/**
 * Register a new credentials user, then sign them in. On success this throws a
 * redirect (handled by Next.js) to the dashboard; on failure it returns a
 * form state describing what went wrong.
 */
export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      status: 'error',
      fieldErrors: collectFieldErrors(parsed.error.issues),
    }
  }

  const { name, email, password } = parsed.data

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true },
  })
  if (existing) {
    return {
      status: 'error',
      message: 'An account with this email already exists.',
    }
  }

  const hashedPassword = await hashPassword(password)
  await db.insert(users).values({ name, email, hashedPassword })

  try {
    await signIn('credentials', { email, password, redirectTo: '/dashboard' })
  } catch (error) {
    if (isNextRedirect(error)) throw error
    // Account was created but auto-login failed — send them to log in manually.
    return {
      status: 'error',
      message: 'Account created, but sign-in failed. Please log in.',
    }
  }
  return { status: 'idle' }
}

/** Authenticate an existing user with email + password. */
export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      status: 'error',
      fieldErrors: collectFieldErrors(parsed.error.issues),
    }
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/dashboard',
    })
  } catch (error) {
    if (isNextRedirect(error)) throw error
    if (error instanceof AuthError) {
      return { status: 'error', message: 'Invalid email or password.' }
    }
    throw error
  }
  return { status: 'idle' }
}
