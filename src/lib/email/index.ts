import 'server-only'

import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

export interface EmailMessage {
  to: string
  subject: string
  /** Plain-text body (always sent as a fallback for HTML clients). */
  text: string
  /** HTML body. */
  html: string
}

export interface SendResult {
  /** True only when the message was actually handed to the provider. */
  sent: boolean
  /** True when email is disabled/unconfigured, so nothing was sent. */
  skipped?: boolean
  reason?: 'email-disabled' | 'send-error'
}

/**
 * Email is only "on" when it has been explicitly toggled AND a provider is
 * configured. `env` fails fast at boot if EMAIL_ENABLED=true without a provider,
 * so in practice this is equivalent to `env.EMAIL_ENABLED` — but we re-check the
 * provider fields so a misconfiguration degrades to a no-op instead of a throw.
 */
export function isEmailEnabled(): boolean {
  return Boolean(
    env.EMAIL_ENABLED && env.EMAIL_FROM && env.SMTP_HOST && env.SMTP_PORT,
  )
}

/**
 * Send an email if — and only if — email is enabled and configured. When it's
 * off this is a safe no-op: it logs at debug and returns `{ sent: false,
 * skipped: true }`, so callers never have to branch on configuration.
 *
 * A send failure is logged and returned as `{ sent: false }` rather than thrown,
 * so a flaky mail server can't break the surrounding action (e.g. user creation
 * still succeeds even if the invite email bounces).
 */
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  if (!isEmailEnabled()) {
    logger.debug('Email disabled — skipping send', {
      to: message.to,
      subject: message.subject,
    })
    return { sent: false, skipped: true, reason: 'email-disabled' }
  }

  try {
    // Loaded lazily so nodemailer is never pulled into a bundle when email is
    // off (and never anywhere near the edge runtime).
    const { getTransport } = await import('@/lib/email/transport')
    await getTransport().sendMail({
      from: env.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    })
    logger.info('Email sent', { to: message.to, subject: message.subject })
    return { sent: true }
  } catch (error) {
    logger.error('Email send failed', {
      to: message.to,
      subject: message.subject,
      error: String(error),
    })
    return { sent: false, reason: 'send-error' }
  }
}
