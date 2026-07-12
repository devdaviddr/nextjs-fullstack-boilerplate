import 'server-only'

import nodemailer, { type Transporter } from 'nodemailer'

import { env } from '@/lib/env'

let cached: Transporter | null = null

/**
 * Lazily-built, memoised SMTP transport. Only reached from `sendEmail()` after
 * `isEmailEnabled()` has confirmed the provider vars are set, so the non-null
 * assertions below hold. SMTP is deliberately provider-agnostic — point it at
 * Resend, SendGrid, Mailgun, SES, Postmark, or your own server.
 */
export function getTransport(): Transporter {
  if (cached) return cached

  const port = env.SMTP_PORT!
  cached = nodemailer.createTransport({
    host: env.SMTP_HOST!,
    port,
    // Implicit TLS on 465; STARTTLS on 587/25. Overridable via SMTP_SECURE.
    secure: env.SMTP_SECURE || port === 465,
    auth: env.SMTP_USER
      ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
      : undefined,
  })
  return cached
}
