'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { db } from '@/db'
import { users } from '@/db/schema'
import { auth } from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/auth/email-verification'
import type { AuthFormState } from '@/lib/auth/form-state'
import { hashPassword } from '@/lib/auth/password'
import {
  consumeVerificationToken,
  issueVerificationToken,
  PASSWORD_RESET_TTL_MS,
} from '@/lib/auth/verification-tokens'
import { isEmailEnabled, sendEmail } from '@/lib/email'
import { passwordResetEmail } from '@/lib/email/templates'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { AUTH_LIMITS, rateLimit } from '@/lib/rate-limit'
import { clientIpFromHeaders } from '@/lib/request-ip'
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/lib/validations/auth'

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

async function clientIp(): Promise<string> {
  return clientIpFromHeaders(await headers())
}

const TOO_MANY = 'Too many attempts. Please wait a few minutes and try again.'
// Same wording no matter what — never reveals whether an account exists.
const RESET_REQUESTED =
  "If an account exists for that email, we've sent a password reset link."

function link(path: string, params: Record<string, string>): string {
  const url = new URL(path, env.APP_URL)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return url.toString()
}

/**
 * Request a password reset. Always responds with the same message regardless of
 * whether the email is registered (anti-enumeration). Only credentials users
 * (those with a password) actually get an email; OAuth-only accounts have no
 * password to reset.
 */
export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      status: 'error',
      fieldErrors: collectFieldErrors(parsed.error.issues),
    }
  }

  // Email off → be honest rather than pretending to send (FR6).
  if (!isEmailEnabled()) {
    return {
      status: 'error',
      message:
        "Email isn't configured for this app — contact an administrator to reset your password.",
    }
  }

  const ip = await clientIp()
  const { email } = parsed.data
  const limit = rateLimit(
    `reset:${ip}:${email}`,
    AUTH_LIMITS.login.limit,
    AUTH_LIMITS.login.windowMs,
  )
  if (!limit.success) {
    logger.warn('Password reset rate limit exceeded', { ip })
    return { status: 'error', message: TOO_MANY }
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, hashedPassword: true },
  })

  if (user?.hashedPassword) {
    const token = await issueVerificationToken(
      email,
      'password-reset',
      PASSWORD_RESET_TTL_MS,
    )
    await sendEmail(
      passwordResetEmail({
        to: email,
        url: link('/reset-password', { token, email }),
      }),
    )
  } else {
    logger.debug('Password reset requested for non-resettable account', {
      email,
    })
  }

  return { status: 'success', message: RESET_REQUESTED }
}

/**
 * Complete a password reset. Consumes the single-use token, updates the hash,
 * and redirects to /login. Session revocation is out of scope (JWT sessions
 * aren't server-revocable today — documented limitation).
 */
export async function resetPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      status: 'error',
      fieldErrors: collectFieldErrors(parsed.error.issues),
    }
  }

  const { email, token, password } = parsed.data
  const ip = await clientIp()
  const limit = rateLimit(
    `reset-submit:${ip}:${email}`,
    AUTH_LIMITS.login.limit,
    AUTH_LIMITS.login.windowMs,
  )
  if (!limit.success) return { status: 'error', message: TOO_MANY }

  const valid = await consumeVerificationToken(email, token, 'password-reset')
  if (!valid) {
    return {
      status: 'error',
      message: 'This reset link is invalid or has expired. Request a new one.',
    }
  }

  const hashedPassword = await hashPassword(password)
  await db.update(users).set({ hashedPassword }).where(eq(users.email, email))

  redirect('/login?reset=success')
}

/**
 * Resend the email-verification link to the signed-in user. Safe no-op-ish when
 * email is off or the user is already verified.
 */
export async function resendVerificationEmail(
  _prev: AuthFormState,
  _formData: FormData,
): Promise<AuthFormState> {
  const session = await auth()
  const email = session?.user?.email
  if (!email) return { status: 'error', message: 'You are not signed in.' }
  if (!isEmailEnabled()) {
    return { status: 'error', message: 'Email is not configured for this app.' }
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { emailVerified: true },
  })
  if (user?.emailVerified) {
    return { status: 'success', message: 'Your email is already verified.' }
  }

  await sendVerificationEmail(email)
  return {
    status: 'success',
    message: 'Verification email sent. Check your inbox.',
  }
}
