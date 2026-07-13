import type { EmailMessage } from '@/lib/email'

export interface InviteEmailInput {
  to: string
  inviteUrl: string
  /** Shown in the copy; defaults to a neutral phrase. */
  appName?: string
}

/**
 * Invite email for an admin-created (passwordless) account. The link carries the
 * single-use invite token; it expires in 7 days (see `INVITE_TTL_MS`).
 */
export function inviteEmail({
  to,
  inviteUrl,
  appName = 'the app',
}: InviteEmailInput): EmailMessage {
  const subject = `You've been invited to ${appName}`

  const text = [
    `You've been invited to ${appName}.`,
    '',
    'Set your password and get started:',
    inviteUrl,
    '',
    'This link can be used once and expires in 7 days.',
    "If you weren't expecting this, you can ignore this email.",
  ].join('\n')

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:20px;">You've been invited to ${appName}</h1>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46;">
          Set your password to get started. This link can be used once and expires in 7 days.
        </p>
        <a href="${inviteUrl}" style="display:inline-block;padding:10px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
          Set your password
        </a>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#71717a;word-break:break-all;">
          Or paste this link into your browser:<br />${inviteUrl}
        </p>
        <p style="margin:16px 0 0;font-size:12px;color:#a1a1aa;">
          If you weren't expecting this, you can ignore this email.
        </p>
      </td></tr>
    </table>
  </body>
</html>`

  return { to, subject, text, html }
}

/** Shared card/button HTML wrapper so every transactional email matches. */
function emailShell({
  heading,
  body,
  cta,
  url,
}: {
  heading: string
  body: string
  cta: string
  url: string
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:20px;">${heading}</h1>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46;">${body}</p>
        <a href="${url}" style="display:inline-block;padding:10px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">${cta}</a>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#71717a;word-break:break-all;">
          Or paste this link into your browser:<br />${url}
        </p>
        <p style="margin:16px 0 0;font-size:12px;color:#a1a1aa;">
          If you weren't expecting this, you can safely ignore this email.
        </p>
      </td></tr>
    </table>
  </body>
</html>`
}

export interface LinkEmailInput {
  to: string
  url: string
  appName?: string
}

/** Password-reset email. The link carries a single-use token (1-hour TTL). */
export function passwordResetEmail({
  to,
  url,
  appName = 'the app',
}: LinkEmailInput): EmailMessage {
  const subject = `Reset your ${appName} password`
  const text = [
    `We received a request to reset your ${appName} password.`,
    '',
    'Choose a new password here:',
    url,
    '',
    'This link can be used once and expires in 1 hour.',
    "If you didn't request this, you can ignore this email — your password won't change.",
  ].join('\n')
  const html = emailShell({
    heading: 'Reset your password',
    body: 'We received a request to reset your password. This link can be used once and expires in 1 hour.',
    cta: 'Reset password',
    url,
  })
  return { to, subject, text, html }
}

/** Email-verification email. The link carries a single-use token (24h TTL). */
export function verifyEmail({
  to,
  url,
  appName = 'the app',
}: LinkEmailInput): EmailMessage {
  const subject = `Verify your ${appName} email`
  const text = [
    `Confirm your email address to finish setting up your ${appName} account.`,
    '',
    'Verify here:',
    url,
    '',
    'This link can be used once and expires in 24 hours.',
    "If you didn't create an account, you can ignore this email.",
  ].join('\n')
  const html = emailShell({
    heading: 'Verify your email',
    body: 'Confirm your email address to finish setting up your account. This link can be used once and expires in 24 hours.',
    cta: 'Verify email',
    url,
  })
  return { to, subject, text, html }
}
