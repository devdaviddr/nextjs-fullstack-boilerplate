# Next.js Full-Stack Boilerplate

A production-grade starting point for full-stack web apps: **Next.js 16** (App
Router, RSC, Server Actions), **Auth.js v5** email/password auth with
**Argon2id** hashing, **Drizzle ORM** on **PostgreSQL**, **TypeScript** in
strict mode, **Tailwind CSS v4** + **shadcn/ui**, and a full **Docker** +
**CI** setup.

---

## Stack

| Concern       | Choice                                                  |
| ------------- | ------------------------------------------------------- |
| Framework     | Next.js 16 (App Router, React 19, Turbopack)            |
| Language      | TypeScript 5.9 (`strict`, `noUncheckedIndexedAccess`)   |
| Auth          | Auth.js (NextAuth) v5 — Credentials + JWT sessions      |
| Password hash | Argon2id (`@node-rs/argon2`, OWASP params)              |
| Database      | PostgreSQL 17                                           |
| ORM           | Drizzle ORM + drizzle-kit migrations                    |
| Validation    | Zod (shared client/server schemas)                      |
| UI            | Tailwind CSS v4 + shadcn/ui (new-york)                  |
| Unit tests    | Vitest + Testing Library                                |
| E2E tests     | Playwright                                              |
| Tooling       | ESLint (flat) · Prettier · Husky · lint-staged          |
| Container     | Multi-stage Dockerfile (standalone, non-root) + Compose |
| CI            | GitHub Actions (lint · typecheck · unit · e2e · docker) |

## Requirements

- Node.js ≥ 20.9 (22 recommended)
- pnpm ≥ 9 (`corepack enable`)
- Docker (for the local database)

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# generate a real secret and paste it into AUTH_SECRET:
npx auth secret            # or: openssl rand -base64 33

# 3. Start Postgres
pnpm docker:db             # docker compose up -d db

# 4. Apply the schema
pnpm db:migrate

# 5. (optional) Seed a demo user  → demo@example.com / Password123
pnpm db:seed

# 6. Run the app
pnpm dev                   # http://localhost:3000
```

## Project structure

```
src/
├── app/
│   ├── (auth)/            # login + register (route group, shared layout)
│   ├── (dashboard)/       # protected app area
│   ├── api/
│   │   ├── auth/[...nextauth]/   # Auth.js endpoints
│   │   └── health/        # DB-backed liveness probe
│   ├── layout.tsx · page.tsx · globals.css
├── components/
│   ├── auth/              # forms, submit button, field errors
│   └── ui/                # shadcn/ui primitives
├── db/
│   ├── schema.ts          # Drizzle schema (Auth.js-adapter compatible)
│   ├── index.ts           # pooled client (singleton)
│   ├── migrate.ts · seed.ts
├── lib/
│   ├── auth/
│   │   ├── config.ts      # EDGE-safe config (used by proxy)
│   │   ├── index.ts       # full Node config + Credentials provider
│   │   ├── password.ts    # Argon2id hash/verify
│   │   └── actions.ts     # register / login server actions
│   ├── validations/       # Zod schemas
│   ├── env.ts             # validated environment (fail fast)
│   └── utils.ts
├── proxy.ts               # edge route protection (Next 16 "proxy")
└── types/next-auth.d.ts   # session typing
```

## Authentication design

- **Argon2id** (memory-hard) for password hashing with OWASP-recommended
  parameters (`src/lib/auth/password.ts`).
- **JWT session strategy** — required for the Credentials provider; the session
  carries the user id via typed `jwt`/`session` callbacks.
- **Edge/Node split** — `proxy.ts` imports only `auth/config.ts`
  (no DB, no native crypto), so route protection runs on the edge. The
  Credentials provider, database, and Argon2 live in the Node-only
  `auth/index.ts`.
- **Defence in depth** — the proxy (edge) guards `/dashboard`, _and_ the page
  re-checks the session server-side.
- **User-enumeration resistance** — a failed lookup still performs a dummy
  Argon2 verify so response timing doesn't leak whether an email exists.
- **Adapter-ready schema** — the `users/accounts/sessions/verificationTokens`
  tables match the Auth.js Drizzle adapter, so adding GitHub/Google OAuth later
  is a few lines (see the note in `src/lib/auth/index.ts`).

## Database & migrations

```bash
pnpm db:generate   # generate SQL migrations from schema changes
pnpm db:migrate    # apply pending migrations
pnpm db:push       # push schema without a migration (prototyping only)
pnpm db:studio     # open Drizzle Studio
pnpm db:seed       # insert the demo user
```

Migrations are committed under `drizzle/`. Generate a new one whenever you edit
`src/db/schema.ts`.

## Testing

```bash
pnpm test           # unit tests (Vitest)
pnpm test:coverage  # unit tests with coverage
pnpm test:e2e       # Playwright (needs a migrated DB + built app)
```

The E2E flow registers a user, verifies the dashboard, signs out, and signs
back in. Run against a live database:

```bash
pnpm docker:db && pnpm db:migrate && pnpm build && pnpm test:e2e
```

## Quality gates

```bash
pnpm lint            # ESLint (flat config)
pnpm typecheck       # tsc --noEmit
pnpm format          # Prettier write
```

Husky + lint-staged run ESLint and Prettier on staged files at commit time
(`pnpm dlx husky` is wired via the `prepare` script on install).

## Docker

**Just the database (local dev):**

```bash
pnpm docker:db
```

**Full stack (app + db + migrations), production-like:**

```bash
AUTH_SECRET=$(openssl rand -base64 33) \
  docker compose -f docker-compose.prod.yml up --build
```

The app image is a multi-stage build using Next.js `standalone` output, runs as
a non-root user, and ships a `/api/health` container healthcheck. A one-shot
`migrate` service applies migrations before the app starts.

## Environment variables

| Variable          | Required | Notes                                      |
| ----------------- | :------: | ------------------------------------------ |
| `DATABASE_URL`    |    ✅    | Postgres connection string                 |
| `AUTH_SECRET`     |    ✅    | `npx auth secret` — rotate per environment |
| `AUTH_URL`        |    –     | Canonical URL; set in production           |
| `AUTH_TRUST_HOST` |    –     | `true` behind a trusted proxy / in Docker  |
| `NODE_ENV`        |    –     | `development` \| `test` \| `production`    |

All variables are validated at boot in `src/lib/env.ts` — a missing or invalid
value fails fast with a readable error.

## Production checklist

- [ ] Set a unique, strong `AUTH_SECRET` per environment (never reuse).
- [ ] Point `DATABASE_URL` at managed Postgres with TLS (`sslmode=require`).
- [ ] Run `pnpm db:migrate` as a deploy step (the Compose `migrate` service
      shows the pattern).
- [ ] Terminate TLS at a trusted proxy and set `AUTH_TRUST_HOST=true`.
- [ ] Add rate limiting to the login/register routes (e.g. Upstash) before
      going public.
- [ ] Wire error tracking (Sentry) and structured logging.

## Extending

- **Add OAuth:** enable `DrizzleAdapter(db)` and add providers in
  `src/lib/auth/index.ts`.
- **Add a shadcn component:** `pnpm dlx shadcn@latest add <name>`.
- **Add a table:** edit `src/db/schema.ts`, then `pnpm db:generate && pnpm db:migrate`.
