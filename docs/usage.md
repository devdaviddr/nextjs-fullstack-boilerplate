# Usage & Development

[← Back to README](../README.md)

## Requirements

- Node.js ≥ 20.9 (22 recommended)
- [pnpm](https://pnpm.io) — `corepack enable`
- Docker (for local Postgres)

## Environment variables

Copy `.env.example` → `.env`. All variables are validated at boot in `src/lib/env.ts` — a missing or malformed value fails fast with a readable error.

| Variable          | Required | Notes                                                   |
| ----------------- | :------: | ------------------------------------------------------- |
| `DATABASE_URL`    |    ✅    | Postgres connection string                              |
| `AUTH_SECRET`     |    ✅    | `npx auth secret` — unique per environment, never reuse |
| `AUTH_URL`        |    –     | Canonical URL; set in production                        |
| `AUTH_TRUST_HOST` |    –     | `true` behind a trusted proxy / in Docker               |
| `NODE_ENV`        |    –     | `development` \| `test` \| `production`                 |

## Scripts

| Command                                                                 | Description                            |
| ----------------------------------------------------------------------- | -------------------------------------- |
| `pnpm dev`                                                              | Start the dev server (Turbopack)       |
| `pnpm build` / `pnpm start`                                             | Production build / serve               |
| `pnpm lint` · `pnpm lint:fix`                                           | ESLint                                 |
| `pnpm typecheck`                                                        | `tsc --noEmit`                         |
| `pnpm format` · `pnpm format:check`                                     | Prettier                               |
| `pnpm test` · `pnpm test:watch` · `pnpm test:coverage`                  | Vitest units                           |
| `pnpm test:e2e` · `pnpm test:e2e:ui`                                    | Playwright E2E                         |
| `pnpm db:generate` · `db:migrate` · `db:push` · `db:studio` · `db:seed` | Database (see [Database](database.md)) |
| `pnpm gen:icons`                                                        | Regenerate PWA icons                   |
| `pnpm docker:db`                                                        | Start the local Postgres container     |

## Testing

```bash
pnpm test            # unit tests (Vitest)
pnpm test:coverage   # units with coverage
pnpm test:e2e        # E2E (needs a migrated DB + running/built app)
```

- **Unit** tests live in `tests/unit/` (password hashing, validation schemas). The `server-only` guard is stubbed for the test runner (see `vitest.config.ts`).
- **E2E** tests live in `tests/e2e/` (auth flow, protected-route redirects, PWA manifest/SW/offline). Playwright boots `pnpm dev` locally and `pnpm start` in CI.

Full green run against a live database:

```bash
pnpm docker:db && pnpm db:migrate && pnpm build && pnpm test:e2e
```

## Docker

**Local database only:**

```bash
pnpm docker:db          # docker compose up -d db
```

**Full production-like stack (app + db + one-shot migrator):**

```bash
AUTH_SECRET=$(openssl rand -base64 33) \
  docker compose -f docker-compose.prod.yml up --build
```

The app image is a multi-stage build using Next.js `standalone` output, runs as a non-root user, and exposes `/api/health` as a container healthcheck. The `migrate` service applies migrations before the app starts.

## Git hooks

Husky installs a `pre-commit` hook that runs **lint-staged** (ESLint + Prettier on staged files). It's wired via the `prepare` script on `pnpm install`. To bypass in an emergency: `git commit --no-verify`.

## Continuous integration

`.github/workflows/ci.yml` runs on push/PR to `main`:

1. **Quality** — install, format check, lint, typecheck, unit tests (coverage).
2. **E2E** — spins up a Postgres service, migrates, builds, runs Playwright.
3. **Docker** — builds the production image with layer caching.

## Extending

| Task                   | How                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| Add a protected route  | Create a page under `src/app/(dashboard)/`, add its prefix to `PROTECTED_PREFIXES` in `src/lib/auth/config.ts` |
| Add a sidebar link     | Add `{ title, href, icon }` to `src/lib/shell/nav.ts`                                                          |
| Add a table            | Edit `src/db/schema.ts`, then `pnpm db:generate && pnpm db:migrate`                                            |
| Add a shadcn component | `pnpm dlx shadcn@latest add <name>`                                                                            |
| Add OAuth              | Enable `DrizzleAdapter(db)` and add providers in `src/lib/auth/index.ts` (schema is adapter-ready)             |
| Add an env var         | Add it to the schema in `src/lib/env.ts` and to `.env.example`                                                 |

## Production checklist

- [ ] Unique, strong `AUTH_SECRET` per environment.
- [ ] `DATABASE_URL` on managed Postgres with TLS (`sslmode=require`).
- [ ] Run `pnpm db:migrate` as a deploy step.
- [ ] Terminate TLS at a trusted proxy; set `AUTH_TRUST_HOST=true`.
- [ ] Add rate limiting to login/register (e.g. Upstash).
- [ ] Wire error tracking (Sentry) and structured logging.
- [ ] Serve over HTTPS so the service worker registers and the app is installable.
- [ ] Replace placeholder icons (`pnpm gen:icons`) and set the manifest name/colors.
