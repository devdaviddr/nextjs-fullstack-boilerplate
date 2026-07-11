# Features

[← Back to README](../README.md)

A complete inventory of what ships in this boilerplate.

## Authentication

- **Email + password** via Auth.js (NextAuth) v5.
- **Argon2id** password hashing (`@node-rs/argon2`) with OWASP-recommended parameters.
- **JWT session strategy** with the user id carried on the token and session.
- **Edge-protected routes** — a lightweight `proxy.ts` guards protected paths on the edge runtime; pages re-check server-side (defense in depth).
- **User-enumeration resistance** — failed logins run a dummy hash verify so response timing doesn't reveal whether an account exists.
- **Resilient sessions** — an undecryptable cookie (e.g. after an `AUTH_SECRET` rotation) is treated as "signed out" instead of crashing the request.
- **OAuth-ready schema** — `users / accounts / sessions / verificationTokens` tables match the Auth.js Drizzle adapter, so social login is a small addition.

See [Architecture → Authentication](architecture.md#authentication-design) for the design.

## Database

- **PostgreSQL 17** with **Drizzle ORM** (type-safe, SQL-first).
- **drizzle-kit** migrations, committed under `drizzle/`.
- Pooled, hot-reload-safe client; idempotent seed script.

See [Database](database.md).

## Progressive Web App

- Installable web app manifest, generated icon set (incl. maskable), theme color, iOS home-screen metadata.
- Hand-rolled service worker with **auth-safe caching** — static assets cached, API/auth never cached.
- Offline fallback page and an install prompt.
- No extra runtime dependencies and no bundler change (stays on Turbopack).

See [PWA & App Shell](pwa.md).

## UI & responsive shell

- **Tailwind CSS v4** + **shadcn/ui** components.
- Minimal, borderless **app shell**: fixed sidebar on desktop, off-canvas drawer on mobile, sticky topbar.
- Safe-area insets for installed PWA (notch-aware).
- Data-driven navigation with active-state highlighting.
- Auth pages (login/register) with accessible forms and inline validation.

## Developer experience

- **Strict TypeScript** (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`).
- **ESLint** (flat config, `eslint-config-next`) + **Prettier** (+ Tailwind plugin).
- **Husky** `pre-commit` running **lint-staged**.
- Path alias `@/*`, editor recommendations (`.vscode/`).
- Zod-validated environment that **fails fast** at boot.

## Testing

- **Vitest** + Testing Library for units (password hashing, validation schemas).
- **Playwright** for E2E (full auth flow, protected-route redirects, PWA manifest/SW/offline).
- Runs locally and in CI against a real Postgres.

## Delivery

- **Multi-stage Dockerfile** — Next.js `standalone` output, non-root user, healthcheck.
- **docker-compose** for local Postgres and a full production-like stack (app + db + one-shot migrator).
- **GitHub Actions** CI: lint · typecheck · unit · E2E (with Postgres service) · Docker build.

See [Usage & Development](usage.md).
