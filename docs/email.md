# Email (setup, verification & password reset)

[← Back to README](../README.md)

Transactional email is **opt-in**. It's off unless `EMAIL_ENABLED=true` **and** a
provider is configured; when off, `sendEmail()` is a safe no-op (logs at debug,
never throws), so nothing that sends mail can block the surrounding action.

Email powers three flows:

- **Invite links** — admins create passwordless accounts; the invitee sets a
  password via a single-use link (see [Features → Invite claim](features.md#invite-based-account-claim)).
- **Password reset** — `/forgot-password` → emailed link → `/reset-password`.
- **Email verification** — sent on registration; confirmed at `/verify-email`.

Reset and verification are [spec 0011](../specs/0011-email-verification-password-reset.md).

## Setup

`nodemailer` over SMTP — provider-agnostic (Resend, SendGrid, Mailgun, SES,
Gmail, … all expose SMTP). Set these in `.env` and restart:

```bash
EMAIL_ENABLED="true"
EMAIL_FROM="no-reply@yourdomain.com"
SMTP_HOST="smtp.yourprovider.com"
SMTP_PORT="587"
SMTP_USER="..."
SMTP_PASSWORD="..."
SMTP_SECURE="false"   # true for port 465 (implicit TLS); false for 587 (STARTTLS)
```

The env schema **fails fast at boot** if `EMAIL_ENABLED=true` but `EMAIL_FROM` /
`SMTP_HOST` / `SMTP_PORT` are missing — a misconfiguration is a startup error,
not a silent drop.

### Local testing

Point SMTP at a local catcher so nothing leaves your machine — e.g.
[Mailpit](https://github.com/axllent/mailpit):

```bash
docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit
# then in .env:
EMAIL_ENABLED="true"
EMAIL_FROM="dev@example.com"
SMTP_HOST="localhost"
SMTP_PORT="1025"
SMTP_SECURE="false"
```

Open the Mailpit UI at <http://localhost:8025> to read the links.

## Password reset flow

1. User visits `/forgot-password` and submits their email.
2. The response is **always the same** — "if an account exists, we've sent a
   link" — regardless of whether the email is registered (no account
   enumeration). Only accounts that actually have a password are emailed
   (OAuth-only accounts have nothing to reset).
3. The emailed link carries a single-use token (**1-hour** expiry); only its
   SHA-256 hash is stored, `purpose`-scoped so it can't be replayed as a
   verification token.
4. `/reset-password` consumes the token, sets the new password, and redirects to
   login. The request endpoints are rate-limited.

> When email is disabled, `/forgot-password` says so ("contact an
> administrator") rather than pretending to send.

## Email verification & the soft gate

When email is enabled, a verification email is sent on registration; users can
resend it from Settings. Verifying sets `users.email_verified`.

`REQUIRE_EMAIL_VERIFICATION=true` turns on a **soft gate** (only meaningful when
email is enabled):

- Unverified users see a dismissible banner with a resend button.
- Admin **mutations** are blocked server-side until they verify
  (`requireEmailVerifiedIfEnforced`).
- They are **not** locked out of the whole app — it's a nudge, not a wall. Apps
  needing a hard gate can extend `proxy.ts`'s role-required map.

```bash
REQUIRE_EMAIL_VERIFICATION="false"   # default
```

## Security notes

- Tokens are stored as SHA-256 hashes, time-safe compared, and single-use.
- Anti-enumeration response shapes match the rest of the app (registration,
  invite claim).
- Session revocation on password reset is **out of scope** — JWT sessions aren't
  server-revocable today (documented limitation; see
  [Architecture → Session strategy](architecture.md#session-strategy--revocation)).

## Related

- [OAuth (GitHub & Google)](oauth.md) — the provider sign-in that coexists with
  credentials + reset.
- [Spec 0011 — Email verification & password reset](../specs/0011-email-verification-password-reset.md)
