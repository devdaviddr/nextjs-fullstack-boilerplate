# Database

[← Back to README](../README.md)

PostgreSQL 17 accessed through [Drizzle ORM](https://orm.drizzle.team) with a `postgres-js` driver.

## Schema

Defined in `src/db/schema.ts`. Tables follow the Auth.js Drizzle-adapter conventions so OAuth can be added later without a rewrite.

| Table                 | Purpose                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`               | Accounts. `hashed_password` (null for OAuth-only or unclaimed invited users), `invite_token_hash` + `invite_expires` (single-use invite claim), timestamps, unique email index. |
| `roles`               | Named roles (`admin`, `member`, …) — unique name + optional description.                                                                                                        |
| `user_roles`          | Many-to-many join of users ↔ roles (composite PK; cascades on user/role delete).                                                                                                |
| `accounts`            | OAuth provider links (unused by credentials flow, ready for OAuth).                                                                                                             |
| `sessions`            | Database sessions (unused under JWT strategy, ready for adapter use).                                                                                                           |
| `verification_tokens` | Email verification / magic-link tokens (schema present; not yet wired).                                                                                                         |
| `authenticators`      | WebAuthn/passkey credentials (ready for future use).                                                                                                                            |

Roles are read from a `roles: string[]` claim on the JWT — see
[Features → Access control](features.md#access-control-rbac). The two invite
columns on `users` back the passwordless
[invite claim flow](features.md#invite-based-account-claim); the raw token is
never stored, only its SHA-256 hash.

Inferred types are exported for app code:

```ts
import type { User, NewUser } from '@/db/schema'
```

## The client

`src/db/index.ts` exposes a single pooled client (`db`) stashed on `globalThis` in development so hot reloads don't exhaust connections. It is `server-only` — importing it from a client component is a build error.

```ts
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

const user = await db.query.users.findFirst({
  where: eq(users.email, email),
})
```

## Migrations workflow

Migrations are generated from the schema and **committed** under `drizzle/`.

```bash
pnpm db:generate   # diff schema → new SQL migration in drizzle/
pnpm db:migrate    # apply pending migrations (uses src/db/migrate.ts)
pnpm db:push       # push schema directly, no migration file (prototyping only)
pnpm db:studio     # open Drizzle Studio (visual browser)
```

**Workflow:** edit `src/db/schema.ts` → `pnpm db:generate` → review the SQL → commit it → `pnpm db:migrate`.

In production, run `pnpm db:migrate` as a deploy step. The `migrate` service in `docker-compose.prod.yml` shows the one-shot pattern (runs before the app starts).

## Seeding

`pnpm db:seed` inserts an idempotent demo user, creates the `admin` / `member` /
`viewer` roles, and grants `admin` to that user:

```
demo@example.com / Password123   (admin)
```

Safe to run repeatedly — it no-ops if the user/role already exist. Never run the seed against production.

## Connection string

Set `DATABASE_URL` in `.env`. The local default (matching `docker-compose.yml`):

```
postgresql://postgres:postgres@localhost:5432/app?sslmode=disable
```

In production, point it at managed Postgres with TLS (`sslmode=require`).
