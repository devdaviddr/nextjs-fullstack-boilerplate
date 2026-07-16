# CI/CD

[← Back to README](../README.md)

This documentation covers the CI/CD pipeline and testing workflow for the Next.js Fullstack Boilerplate. Deployment is covered separately in [deployment.md](deployment.md).

### Pipeline Overview

Two workflows run on every push and pull request to `main`:

```
┌─────────────────────────────────────────────────────────────┐
│ .github/workflows/ci.yml  (push / PR → main)                │
├─────────────────────────────────────────────────────────────┤
│ quality : format:check · lint · typecheck · test:coverage    │
│           · pnpm audit (non-blocking)                        │
│ e2e     : Postgres service + MinIO + Mailpit → migrate/seed   │
│           → build → Playwright (uploads report artifact)     │
│ docker  : needs quality+e2e; per-arch native build (amd64 +   │
│           arm64) → push by digest                             │
│ merge   : assemble multi-arch manifest → publish 2 GHCR images │
│           (app + migrate) on main/tags; PRs build only        │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ .github/workflows/codeql.yml  (push / PR → main · weekly)   │
├─────────────────────────────────────────────────────────────┤
│ analyze : CodeQL security-and-quality (javascript-typescript)│
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ .github/workflows/deploy.yml  (release tags · opt-in)       │
├─────────────────────────────────────────────────────────────┤
│ deploy  : `make deploy` on a self-hosted runner, gated by    │
│           vars.SELF_HOSTED_DEPLOY (off by default)           │
└─────────────────────────────────────────────────────────────┘
```

`quality` and `e2e` run independently; **`docker` now needs both** (it only
publishes tested images). Publishing and the opt-in `deploy.yml` are the
continuous-deployment story — see [self-hosting.md](self-hosting.md#continuous-deployment).

### Quality Gates

Before any PR can be merged, all checks must pass:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

#### 1. Linting & Formatting

**ESLint** (flat config, Next.js) + **Prettier** + **Tailwind plugin** + **Husky pre-commit**.

```bash
pnpm lint          # check only
pnpm lint:fix      # auto-fix
pnpm format        # auto-fix (includes lint-staged)
pnpm format:check  # verify
```

**Hook:** `pre-commit` runs `lint-staged` on staged files.

#### 2. Type Safety

**tsc --noEmit** with strict mode flags.

```bash
pnpm typecheck
```

#### 3. Unit Tests (Vitest)

Run once or in watch mode:

```bash
pnpm test                    # run all
pnpm test:watch              # watch mode
pnpm test:coverage           # with coverage report
```

**Scope:** password hashing, validation schemas, upload validation, rate limiting, tokens, RBAC, OAuth, email soft-gate, Web Push.

#### 4. E2E Tests (Playwright)

Full browser stack for end-to-end flows:

```bash
pnpm test:e2e        # headless
pnpm test:e2e:ui     # interactive UI runner
```

**Prerequisites:** migrated + seeded DB, running MinIO, running Mailpit.

**Full local test suite:**

```bash
pnpm docker:db && pnpm docker:minio && pnpm docker:mail && \
  pnpm db:migrate && pnpm db:seed && pnpm build && pnpm test:e2e
```

**E2E test coverage includes:**

- Auth flows (login, register, sign-out)
- Protected route redirects and RBAC
- File upload/download/delete
- Avatar uploads
- PWA manifest/SW/offline
- SEO (robots/sitemap/OG)
- Accessibility (axe)
- Email reset/verification round-trips (against Mailpit)

### GitHub Actions Configuration

The full source of truth is [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
and [`.github/workflows/codeql.yml`](../.github/workflows/codeql.yml). The
summary below describes what each job actually does — consult the workflow
files for the authoritative YAML.

Both workflows trigger on `push` and `pull_request` to `main` (CodeQL also runs
on a weekly `schedule`); `ci.yml` additionally runs on `v*` tags, which publish
the semver-tagged image. `ci.yml` sets `concurrency` so an in-progress run is
cancelled when a newer commit lands on the same ref, and disables Next.js
telemetry via `NEXT_TELEMETRY_DISABLED`. All jobs run on `ubuntu-latest` with
**Node 22** (no version matrix) and pnpm via `pnpm/action-setup` (version taken
from `package.json`'s `packageManager` field — not pinned in the workflow).

#### `quality` job

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm audit --audit-level=high   # continue-on-error: advisory, non-blocking
```

#### `e2e` job

Postgres runs as a GitHub Actions `services:` container (`postgres:17-alpine`,
health-checked). MinIO and Mailpit **cannot** be `services:` containers (that
block supports only `image`/`env`/`ports`, and the `minio/minio` image needs a
`server /data` command to run), so the workflow starts them explicitly with
`docker run` and polls their health endpoints — mirroring `docker-compose.yml`.
The bucket is `app-files`, created with the `minio/mc` client.

The job then runs `pnpm db:migrate` → `pnpm db:seed` → `pnpm build` →
`pnpm exec playwright install --with-deps chromium` → `pnpm test:e2e`, and
uploads the `playwright-report/` as an artifact (`if: ${{ !cancelled() }}`,
7-day retention). Email is enabled against Mailpit (`EMAIL_ENABLED=true`,
`SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`) so the reset/verification round-trips
run in `email-flow.spec.ts`. `AUTH_SECRET` is a throwaway CI value.

#### `docker` job (+ `docker-merge`)

`needs: [quality, e2e]` — it only publishes **tested** images, and they're
**multi-arch** (`linux/amd64` + `linux/arm64`) so they run on Apple Silicon Mac
minis as well as amd64 servers. To avoid slow QEMU emulation, `docker` is a
matrix that builds each arch on its **own native runner** (`ubuntu-latest` +
`ubuntu-24.04-arm`) and pushes by digest; a `docker-merge` job then assembles the
per-arch digests into one manifest per image via `docker/metadata-action`:

- `ghcr.io/<owner>/<repo>` — the production `runner` target (the app).
- `ghcr.io/<owner>/<repo>/migrate` — the `builder` target, the only one that can
  run `pnpm db:migrate` (the runner standalone image has no tsx/source).

Tags: commit `sha`, the branch, semver on `v*` tags, and `latest` on the default
branch. **Pull requests build both arches cache-only and never push** (login is
skipped; `docker-merge` is gated to non-PR) so forks stay safe. Uses the workflow
`GITHUB_TOKEN` with `packages: write`.

#### CodeQL

`codeql.yml` runs GitHub's CodeQL `security-and-quality` query suite over the
`javascript-typescript` sources on every push/PR and weekly (Monday 06:00 UTC),
publishing results to the repository's Security tab.

#### `deploy.yml` (opt-in continuous deployment)

Skipped unless the repo variable `SELF_HOSTED_DEPLOY == 'true'`. When enabled, it
runs `make deploy` on a **self-hosted runner** on your box (which dials out to
GitHub — tunnel-friendly) on release tags, pulling the freshly published images,
migrating, and restarting. Full design and the pull-based alternative:
[self-hosting.md → Continuous deployment](self-hosting.md#continuous-deployment).

### Local Development Testing

#### Quick Start

```bash
# Start local dependencies
pnpm docker:db
pnpm docker:minio
pnpm docker:mail

# Apply schema
pnpm db:migrate
pnpm db:seed

# Run full test suite
pnpm test:e2e
```

#### Running Tests Interactively

```bash
# Watch mode for units
pnpm test:watch

# Playwright UI runner
pnpm test:e2e:ui
```

#### Test Isolation

Each E2E test uses a unique client IP (from `CF-Connecting-IP`) to isolate rate-limit buckets:

- Prevents test interference
- Ensures accurate rate-limit testing

**Implementation:** `tests/e2e/fixtures.ts`

### Docker Testing

#### Multi-Stage Production Image

Dockerfile builds:

1. **Build stage** - dependencies + Next.js build
2. **Runtime stage** - non-root user, healthcheck

**Healthcheck endpoint:** `/api/health`

#### Docker Compose

- [`docker-compose.yml`](../docker-compose.yml) — local dev dependencies:
  `db`, `minio`, `minio-init` (creates the bucket), and `mailpit`.
- [`docker-compose.prod.yml`](../docker-compose.prod.yml) — the full
  production-like stack, with these services:

  | Service        | Role                                                    |
  | -------------- | ------------------------------------------------------- |
  | `db`           | Postgres 17 (named volume `pgdata`)                     |
  | `migrate`      | Runs `db:migrate` once, then exits                      |
  | `minio`        | S3-compatible object storage (named volume `miniodata`) |
  | `minio-init`   | Creates the bucket on first boot                        |
  | `db-backup`    | Nightly `pg_dump` sidecar                               |
  | `minio-backup` | Nightly object-store backup sidecar                     |
  | `app`          | The Next.js app, health-checked at `/api/health`        |

The two `*-backup` sidecars are covered in [backups.md](backups.md). Cloudflare
Tunnel variants live in `docker-compose.tunnel.yml` and
`docker-compose.quick-tunnel.yml` (see [deployment.md](deployment.md)).

### Deployment Pipeline

#### Pre-deployment Checklist

- [ ] Unique, strong `AUTH_SECRET`
- [ ] `DATABASE_URL` on managed Postgres with TLS (`sslmode=require`)
- [ ] Migrate schema (`pnpm db:migrate`)
- [ ] Seed initial `admin` user
- [ ] Check environment variables

#### Cloudflare Tunnel Deployment

See [deployment.md](deployment.md) for complete Cloudflare Tunnel setup:

- **Quick tunnel:** `make tunnel-quick` (no account)
- **Guided:** Cloudflare dashboard (requires account)
- **Automated:** Terraform (`make tunnel-provision && make tunnel-up`)

### Test Scripts

#### Manual Testing

- **Auth flow:** `/login`, `/register`, `/settings`
- **File operations:** Upload → list → download → delete
- **PWA features:** offline page, install prompt
- **RBAC:** admin panel, role-based access

#### Performance Testing

- **Unit tests:** coverage on validation, hashing, rate limiting
- **E2E tests:** full user journey times

### Troubleshooting

#### Common Issues

1. **502 Bad Gateway**
   - App not ready yet or wrong ingress service
   - Fix: Ensure `http://app:3000` in Ingress

2. **Login loop**
   - Wrong `AUTH_URL` or `AUTH_TRUST_HOST=false`
   - Fix: Set correct public URL in `.env`

3. **Test isolation issues**
   - Rate limiting leaks between tests
   - Fix: Check unique client IP generation

4. **Docker compose health checks**
   - Services not ready
   - Fix: Increase wait time or check logs

#### Debugging Commands

```bash
# Container logs
docker compose logs

# Follow logs
docker compose logs -f

# Database migration logs
pnpm db:generate
pnpm db:migrate

# MinIO status
pnpm dlx @minio/minio-client mc admin info local
```

### Best Practices

1. **Test coverage:** Keep unit test coverage >80%
2. **Isolation:** Each test should be self-contained
3. **Environment:** Use `.env.example` as reference
4. **Versioning:** Test against multiple Node versions in CI (see matrix)
5. **Backups:** Always verify restore procedures before production deployment

### Maintenance

#### Database Migration

Always follow the workflow:

```bash
1. Edit src/db/schema.ts
2. pnpm db:generate
3. Review SQL migration
4. Commit migration file
5. pnpm db:migrate
```

#### Script Updates

Build scripts (`gen:icons`, `gen:og`) need regeneration:

```bash
pnpm gen:icons
pnpm gen:og
```

#### Environment Changes

Update `.env.example` whenever adding new environment variables.
