# Database

[← Back to README](../README.md)

PostgreSQL 17 accessed through [Drizzle ORM](https://orm.drizzle.team) with a `postgres-js` driver.

## Entity-relationship diagram

```mermaid
erDiagram
    users ||--o{ accounts : "OAuth links"
    users ||--o{ sessions : "has"
    users ||--o{ user_roles : ""
    roles ||--o{ user_roles : ""
    users ||--o{ files : "owns"
    users ||--o| files : "avatar_file_id"
    users ||--o{ push_subscriptions : "devices"
    users ||--o{ authenticators : "passkeys"
    users ||..o{ verification_tokens : "by email (not FK)"

    users {
        text id PK
        text email UK
        text name
        timestamp email_verified
        text image
        text avatar_file_id FK
        text hashed_password "null for OAuth-only"
        text invite_token_hash
        timestamp invite_expires
    }
    accounts {
        text provider PK
        text provider_account_id PK
        text user_id FK
        text access_token
        text refresh_token
    }
    sessions {
        text session_token PK
        text user_id FK
        timestamp expires
    }
    verification_tokens {
        text identifier PK "user email"
        text token PK "sha-256 hash"
        timestamp expires
        text purpose "password-reset | email-verify"
    }
    authenticators {
        text credential_id UK
        text user_id FK
        integer counter
    }
    roles {
        text id PK
        text name UK
        text description
    }
    user_roles {
        text user_id PK "FK"
        text role_id PK "FK"
    }
    files {
        text id PK
        text owner_id FK
        text bucket_key UK
        text mime_type
        bigint size_bytes
    }
    push_subscriptions {
        text id PK
        text user_id FK
        text endpoint UK
        text p256dh
        text auth
    }
```

## Schema

Defined in `src/db/schema.ts`. Tables follow the Auth.js Drizzle-adapter conventions — the adapter is wired up for [OAuth](oauth.md).

| Table                 | Purpose                                                                                                                                                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`               | Accounts. `hashed_password` (null for OAuth-only or unclaimed invited users), `email_verified` (set by the [email flow](email.md)), `invite_token_hash` + `invite_expires` (single-use invite claim), `avatar_file_id` (FK → `files.id`, `set null` — current profile photo), timestamps, unique email index. |
| `roles`               | Named roles (`admin`, `member`, `viewer`) — unique name + optional description.                                                                                                                                                                                                                               |
| `user_roles`          | Many-to-many join of users ↔ roles (composite PK; cascades on user/role delete).                                                                                                                                                                                                                              |
| `accounts`            | OAuth provider links (GitHub/Google) — populated by the Drizzle adapter. See [OAuth](oauth.md).                                                                                                                                                                                                               |
| `sessions`            | Database sessions — unused under the JWT strategy, available if you switch (see [Architecture → Session strategy](architecture.md#session-strategy--revocation)).                                                                                                                                             |
| `verification_tokens` | Single-use, SHA-256-hashed, `purpose`-scoped tokens for **password reset** and **email verification**. See [Email](email.md).                                                                                                                                                                                 |
| `authenticators`      | WebAuthn/passkey credentials (schema present; feature not built).                                                                                                                                                                                                                                             |
| `files`               | Uploaded-file registry — owner, S3 bucket key, original name, MIME type, size. See [Features → File uploads](features.md#file-uploads).                                                                                                                                                                       |
| `push_subscriptions`  | Web Push subscriptions — one row per browser/device (`endpoint` unique). See [Features → Web Push](features.md).                                                                                                                                                                                              |

Roles are read from a `roles: string[]` claim on the JWT — see
[Features → Access control](features.md#access-control-rbac). The two invite
columns on `users` back the passwordless
[invite claim flow](features.md#invite-based-account-claim); the `verification_tokens`
`token` and invite hashes store only a SHA-256 of the emailed value, never the
raw token.

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

## Object storage (files)

Uploaded files are stored in **MinIO** (S3-compatible), not Postgres — the
`files` table above only holds metadata + the bucket key. `pnpm docker:minio`
starts it locally; the app is configured via `S3_ENDPOINT` /
`S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_BUCKET` (see
`.env.example`). MinIO has no public ingress in production
(`docker-compose.prod.yml`) — the app is the only thing that talks to it, via
`src/lib/storage/`. See [Features → File uploads](features.md#file-uploads).
