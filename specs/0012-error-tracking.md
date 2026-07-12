---
id: 0012
title: Error tracking (Sentry, opt-in)
status: Proposed
release: '—'
created: 2026-07-13
updated: 2026-07-13
---

# 0012 — Error tracking (Sentry, opt-in)

## Summary

Add opt-in error tracking via Sentry's hosted free tier — client, server, and
edge runtime coverage — activated only when `SENTRY_DSN` is configured.
Follows the same off-by-default pattern as [email](0006-rbac.md): zero
behavior or bundle-size change when unset.

## Problem / motivation

The structured-logging shim (`src/lib/logger.ts`) writes JSON lines to
stdout, which is fine for `docker compose logs` but nobody is going to tail
logs on a home server to notice a production error in a POC or portfolio app.
Without error tracking, a broken deploy is discovered by a visitor, not by the
owner.

## Goals

- Errors from all three Next.js runtimes (client, server/Node, edge) reach
  Sentry when configured.
- No Sentry account required for the default path — fully inert when
  `SENTRY_DSN` is unset.
- No PII (emails, session tokens, request bodies) leaks into error reports by
  default.

## Non-goals

- Self-hosting Sentry — too heavy an operational addition for a homelab box;
  the hosted free tier is the intended target.
- Performance monitoring / tracing (Sentry supports it, but it's a separate,
  higher-overhead opt-in — not enabled by default here).
- Replacing `src/lib/logger.ts` — Sentry captures _exceptions_; structured
  logs remain the record of normal operation.

## Requirements

### Functional

- **FR1** — `@sentry/nextjs` added as a dependency; `sentry.client.config.ts`,
  `sentry.server.config.ts`, and `sentry.edge.config.ts` created, each a
  no-op (SDK not initialized) when `SENTRY_DSN` is unset.
- **FR2** — `next.config.ts` wraps its export with `withSentryConfig` only
  when `SENTRY_DSN` is present at build time — the default build has zero
  Sentry involvement, not just a disabled SDK.
- **FR3** — `error.tsx` and `global-error.tsx` report the caught error to
  Sentry (when configured) before rendering the existing fallback UI.
- **FR4** — `src/lib/logger.ts`'s `error()` level optionally forwards to
  Sentry (`Sentry.captureException`/`captureMessage`) when configured, so
  structured logs and error tracking aren't two disconnected systems.
- **FR5** — `proxy.ts` (edge runtime) errors are captured via the edge config
  — this is the runtime most likely to be silently swallowed otherwise.

### Non-functional

- **NFR1** — `sendDefaultPii: false` and an explicit `beforeSend` scrub
  (strip cookies, auth headers, and request body) — Sentry's defaults are not
  trusted as sufficient given this app handles credentials.
- **NFR2** — Turbopack compatibility is verified before this ships — `@sentry/nextjs`
  has historically leaned on webpack-specific source-map tooling, and this
  repo is Turbopack-only for both dev and build (per `CLAUDE.md`). If the
  current SDK version doesn't fully support Turbopack source maps, ship
  without source-map upload rather than reintroducing webpack.
- **NFR3** — Zero added client bundle weight when `SENTRY_DSN` is unset
  (verified via build output comparison).

## Design / approach

- Config files follow the standard `@sentry/nextjs` App Router setup, each
  gated by `if (!env.SENTRY_DSN) return` at the top before `Sentry.init(...)`.
- `withSentryConfig` wrapping is conditional in `next.config.ts`:

  ```ts
  export default process.env.SENTRY_DSN
    ? withSentryConfig(nextConfig, sentryBuildOptions)
    : nextConfig
  ```

- `SENTRY_DSN`, `SENTRY_ENVIRONMENT` (defaults to `NODE_ENV`), and optionally
  `SENTRY_AUTH_TOKEN` (source-map upload at build time, CI-only secret) added
  to `src/lib/env.ts` as optional.
- The `logger.error` → Sentry bridge is one `if (env.SENTRY_DSN)` branch
  inside `emit()` — keeps the logger the single call site, no call-site churn
  across the codebase.

## Acceptance criteria

- [ ] With `SENTRY_DSN` unset: build output, bundle size, and runtime
      behavior are unchanged from before this spec (diffed).
- [ ] With `SENTRY_DSN` set: a thrown error in a client component, a Server
      Action, and `proxy.ts` all appear in the configured Sentry project.
- [ ] A test error containing a fake email/password in its context is
      confirmed scrubbed before send (`beforeSend` unit-tested).
- [ ] Turbopack build succeeds with Sentry configured (`pnpm build`) — if
      source-map upload isn't supported yet, this is documented as a known
      gap rather than silently broken.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass in both
      configured and unconfigured states.

## Security & privacy

- PII scrubbing (NFR1) is the central concern — a misconfigured Sentry
  integration is a realistic way to leak user data to a third party.
- `SENTRY_AUTH_TOKEN` (if used for source-map upload) is a CI-only secret,
  never present in the runtime container.

## Alternatives considered

- **Self-hosted Sentry (via Docker)** — a genuinely heavy multi-container
  product (Kafka, ClickHouse, Redis, Postgres, Snuba...); wildly
  disproportionate to a homelab box hosting a portfolio app. Rejected.
- **GlitchTip (lighter self-hosted Sentry-API-compatible alternative)** —
  worth a mention as a future option if the hosted free tier's limits become
  a problem, but not adopted now to keep this spec's footprint small.
- **Rolling a custom error-webhook to Slack/Discord** — simpler, but loses
  stack traces, deduplication, and release tracking that Sentry provides for
  free at this scale.

## Out of scope / future

- Performance tracing / session replay.
- Self-hosted Sentry or GlitchTip.
- Alerting rules beyond Sentry's own defaults.

## References

- [Roadmap](../README.md#roadmap).
- [Sentry Next.js SDK docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/).
