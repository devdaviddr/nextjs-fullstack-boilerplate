# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
As this project is pre-1.0, minor versions may introduce breaking changes.

## [Unreleased]

## [0.5.0] - 2026-07-13

### Added

- Role-based access control ([spec 0006](specs/0006-rbac.md)): `roles` / `user_roles`
  tables, roles in the JWT session, `requireRole` / `hasRole` server guards and
  `useRole` / `<RequireRole>` client helpers, edge role-gating in `proxy.ts`, a `/403`
  page, and an admin user-management panel in Settings.
- Invite-only account claim: admin-created users are passwordless and can only be
  claimed with a single-use, hashed, 7-day invite token via `/register?invite=…`.
- Optional email delivery (`src/lib/email/`): SMTP-based, provider-agnostic, and
  **off by default**. It activates only when `EMAIL_ENABLED=true` **and** an SMTP
  provider is configured — enabling it without a provider fails fast at boot, and
  when disabled every send is a safe no-op. Invite links are emailed when enabled and
  always shown in the admin UI as a fallback.

### Changed

- CI and CodeQL now run on `develop` as well as `main`, so feature PRs into the
  integration branch are gated by the full pipeline.

## [0.4.1] - 2026-07-12

### Changed

- Expanded the deployment guide ([docs/deployment.md](docs/deployment.md)) with a
  how-it-works overview, an environment-variables table, and operating /
  troubleshooting sections; added a prominent Deployment section to the README.

## [0.4.0] - 2026-07-12

### Added

- Cloudflare Tunnel deployment ([spec 0005](specs/0005-cloudflare-tunnel-deployment.md)):
  quick-tunnel and named-tunnel Compose overlays, a Terraform module
  (`infra/cloudflare/`), a `Makefile`, `docs/deployment.md`, and a
  `tunnel-verify` doctor. Rate limiting now trusts `CF-Connecting-IP`.
- Spec-driven development: a `specs/` directory with a template, workflow guide,
  and one spec per release.

## [0.3.1] - 2026-07-12

### Added

- `CLAUDE.md` with repo context, conventions, and a gitflow/commit guide for AI
  assistants working in this repository.
- graphify integration for Claude Code (`.claude/settings.json` PreToolUse
  hooks) that queries the knowledge graph before browsing source.

## [0.3.0] - 2026-07-12

### Added

- Auth rate limiting on login and registration — enforced in the server actions
  and, non-bypassably, in the credentials `authorize` callback.
- Nonce-based Content-Security-Policy with `strict-dynamic`, HSTS, and
  `X-Powered-By` disabled.
- Case-insensitive `lower(email)` unique index (defense in depth).
- Accessible mobile drawer: focus trap, Escape to close, focus restore, and a
  skip-to-content link.
- Structured-logging shim and graceful database-pool shutdown on SIGTERM.
- Renovate, CodeQL, commitlint (Conventional Commits), and a CI dependency audit.
- Contributor docs: CONTRIBUTING, SECURITY, and issue/PR templates.
- Tests for auth error paths and rate limiting.

### Changed

- `getCurrentSession` now treats only undecryptable cookies as signed-out;
  genuine errors surface instead of being swallowed.
- Registration relies on the unique constraint (handles the duplicate-signup
  race) and returns a clean error.
- Documentation expanded with a security model and session-revocation notes.

### Fixed

- Service worker no longer reloads on its initial claim (fixed a sign-out race).

## [0.2.0] - 2026-07-11

### Added

- Progressive Web App: web manifest, generated icons, a service worker with
  auth-safe caching, an offline fallback, and an install prompt.
- Minimal, borderless responsive app shell (sidebar + topbar with a mobile
  drawer) with PWA safe-area handling.
- MIT license.

### Fixed

- Resilient session handling and error boundaries (`error.tsx`,
  `global-error.tsx`, `not-found.tsx`) — resolves a Next.js 16 Turbopack
  global-error crash.

### Changed

- README restructured into a `docs/` directory.

## [0.1.0] - 2026-07-11

### Added

- Initial production-grade Next.js 16 boilerplate: App Router, Auth.js v5
  credentials auth (Argon2id, JWT sessions), Drizzle ORM + PostgreSQL,
  Tailwind CSS v4 + shadcn/ui, Vitest + Playwright, a multi-stage Docker image,
  and a GitHub Actions CI pipeline.

[Unreleased]: https://github.com/devdaviddr/nextjs-fullstack-boilerplate/compare/v0.4.1...HEAD
[0.4.1]: https://github.com/devdaviddr/nextjs-fullstack-boilerplate/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/devdaviddr/nextjs-fullstack-boilerplate/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/devdaviddr/nextjs-fullstack-boilerplate/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/devdaviddr/nextjs-fullstack-boilerplate/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/devdaviddr/nextjs-fullstack-boilerplate/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/devdaviddr/nextjs-fullstack-boilerplate/releases/tag/v0.1.0
