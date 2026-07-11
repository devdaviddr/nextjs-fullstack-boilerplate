'use server'

import { eq } from 'drizzle-orm'
import { AuthError } from 'next-auth'
import { headers } from 'next/headers'

import { db } from '@/db'
import { users } from '@/db/schema'
import { signIn, signOut } from '@/lib/auth'
import type { AuthFormState } from '@/lib/auth/form-state'
import { hashPassword } from '@/lib/auth/password'
import { logger } from '@/lib/logger'
import { AUTH_LIMITS, rateLimit } from '@/lib/rate-limit'
import { clientIpFromHeaders } from '@/lib/request-ip'
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

/** Postgres unique-violation SQLSTATE (surfaced by postgres-js as `.code`). */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === '23505'
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

/** Best-effort client IP from proxy headers (falls back to a shared bucket). */
async function clientIp(): Promise<string> {
  return clientIpFromHeaders(await headers())
}

const TOO_MANY = 'Too many attempts. Please wait a few minutes and try again.'

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

  const ip = await clientIp()
  const limit = rateLimit(
    `register:${ip}`,
    AUTH_LIMITS.register.limit,
    AUTH_LIMITS.register.windowMs,
  )
  if (!limit.success) {
    logger.warn('Registration rate limit exceeded', { ip })
    return { status: 'error', message: TOO_MANY }
  }

  const { name, email, password } = parsed.data

  // Fast path — avoid an expensive hash on the common "already taken" case.
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

  // The unique index is the source of truth — catch the race where two
  // concurrent signups both pass the check above.
  try {
    await db.insert(users).values({ name, email, hashedPassword })
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        status: 'error',
        message: 'An account with this email already exists.',
      }
    }
    logger.error('Registration insert failed', { error: String(error) })
    return { status: 'error', message: 'Could not create your account.' }
  }

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

/** Sign the current user out and redirect to the login page. */
export async function signOutAction() {
  await signOut({ redirectTo: '/login' })
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

  const { email, password } = parsed.data

  const ip = await clientIp()
  const limit = rateLimit(
    `login:${ip}:${email}`,
    AUTH_LIMITS.login.limit,
    AUTH_LIMITS.login.windowMs,
  )
  if (!limit.success) {
    logger.warn('Login rate limit exceeded', { ip, email })
    return { status: 'error', message: TOO_MANY }
  }

  try {
    await signIn('credentials', { email, password, redirectTo: '/dashboard' })
  } catch (error) {
    if (isNextRedirect(error)) throw error
    if (error instanceof AuthError) {
      return { status: 'error', message: 'Invalid email or password.' }
    }
    throw error
  }
  return { status: 'idle' }
}
