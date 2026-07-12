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
