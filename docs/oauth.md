# OAuth (GitHub & Google)

[← Back to README](../README.md)

Sign in with GitHub and/or Google, alongside the built-in email + password
(Credentials) flow. Both providers are **opt-in** — each is only wired up when
its env vars are present, so a fork with none set behaves exactly like the
credentials-only default.

Implemented via the Auth.js Drizzle adapter on the existing `users` / `accounts`
tables ([spec 0010](../specs/0010-oauth-providers.md)). Sessions stay **JWT**
(not database sessions), so the edge proxy's route protection keeps doing a
zero-DB-round-trip check.

## How it fits together

- One identity system. GitHub/Google are additional providers on the _same_
  Auth.js instance and `users` table as Credentials — not a parallel auth stack.
- New OAuth users get a **bootstrap role** automatically (`events.createUser`):
  the very first user in a fresh deployment becomes `admin`, everyone after is
  `member`.
- Roles/RBAC, the session shape, and everything downstream are provider-agnostic.

## Enabling a provider

Set both the id and secret for a provider, then restart the app. The login page
shows a "Continue with …" button only for configured providers.

```bash
# GitHub
AUTH_GITHUB_ID="..."
AUTH_GITHUB_SECRET="..."

# Google
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
```

The **callback URLs** to register with each provider are:

```
GitHub → {APP_URL}/api/auth/callback/github
Google → {APP_URL}/api/auth/callback/google
```

`{APP_URL}` is your public origin (`APP_URL` env var; `http://localhost:3000`
in local dev).

### GitHub

1. **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.**
2. **Homepage URL:** your `APP_URL`. **Authorization callback URL:**
   `{APP_URL}/api/auth/callback/github`.
3. Create it, copy the **Client ID** → `AUTH_GITHUB_ID`, generate a **client
   secret** → `AUTH_GITHUB_SECRET`.

### Google

1. **Google Cloud Console → APIs & Services → Credentials → Create credentials
   → OAuth client ID** (configure the consent screen first if prompted).
2. **Application type:** Web application.
3. **Authorized redirect URI:** `{APP_URL}/api/auth/callback/google`.
4. Copy the **Client ID** → `AUTH_GOOGLE_ID` and **Client secret** →
   `AUTH_GOOGLE_SECRET`.

## Account linking & the "already exists" message

Auto-linking on a matching email is **off** (`allowDangerousEmailAccountLinking:
false`). If someone signs in with Google using an email that already belongs to
a credentials account, they are **not** silently merged — that's a known
account-takeover vector. Instead they see:

> An account with this email already exists. Sign in with your password first,
> then link this provider from Settings.

Linking is explicit: sign in, then **Settings → Connected accounts → Link**.
Unlinking is blocked server-side if it would leave you with no password **and**
no other provider (no self-lockout).

## Security notes

- Client secrets live in `.env` only, are validated but never logged, and never
  reach the client — the login page receives booleans (`isGithubConfigured()`),
  not the secret values.
- GitHub and Google both verify email ownership before issuing their token, so
  once you _explicitly_ link a provider the link is trustworthy — the risk is
  only in _implicit_ linking, which is disabled.

## Related

- [Architecture → Authentication design](architecture.md#authentication-design)
- [Email verification & password reset](email.md) — the credentials-side
  account recovery flow OAuth coexists with.
- [Spec 0010 — OAuth providers](../specs/0010-oauth-providers.md)
