---
id: 0011
title: Email verification & password reset
status: Shipped
release: 'v0.11.0'
created: 2026-07-13
updated: 2026-07-13
---

# 0011 — Email verification & password reset

## Summary

Add self-service password reset and optional email verification, reusing the
single-use hashed-token pattern already built for invite links
([0006](0006-rbac.md)) and the previously-unused `verificationTokens` table.
Both flows are inert unless email is enabled, matching the existing
off-by-default posture.

## Problem / motivation

This was called out as deferred hardening in spec 0006: the `emailVerified`
column and `verificationTokens` table exist and are unused, and there's no
way for a credentials user to recover a forgotten password. Both are
expected, table-stakes auth flows.

## Goals

- A user who forgets their password can reset it via a single-use, expiring,
  emailed link — with no account-enumeration signal.
- New accounts can optionally be required to verify their email before full
  access, off by default.
- Zero new crypto primitives — reuse and generalize the existing invite-token
  machinery rather than duplicating it.

## Non-goals

- Multi-factor authentication.
- Magic-link (passwordless) sign-in as a primary auth method — this spec is
  strictly reset + verify for the existing Credentials flow.

## Requirements

### Functional

- **FR1** — Generalize `src/lib/auth/invite.ts` into `src/lib/auth/tokens.ts`:
  `createToken()`/`verifyToken()` become purpose-agnostic single-use hashed
  tokens (same 32-byte/SHA-256/timing-safe/TTL design), used by invites,
  password reset, and email verification alike.
- **FR2** — Add a `purpose` column to `verificationTokens`
  (`'password-reset' | 'email-verify'`) via a Drizzle migration, so the one
  table safely serves both flows without stringly-typed identifier prefixes.
- **FR3** — `/forgot-password` (request) → `/reset-password?token=…&email=…`
  (complete): requests a 1-hour token, emails a reset link via the existing
  `sendEmail()`/template pattern, and always responds with the same
  "if an account exists, we've sent a link" message regardless of whether the
  email is registered.
- **FR4** — On successful reset: hash the new password (`hashPassword`),
  update the user, delete the token row (single-use), and invalidate existing
  sessions is out of scope (JWT sessions aren't server-revocable today — note
  as a known limitation, consistent with existing session docs).
- **FR5** — `REQUIRE_EMAIL_VERIFICATION` env flag (default `false`). When
  `true`, unverified users see a persistent, dismissible-only-after-verifying
  banner and are blocked from admin actions (not from the whole app — soft
  gate, not a hard lockout) until `emailVerified` is set.
- **FR6** — When email is disabled (`isEmailEnabled() === false`),
  `/forgot-password` shows an explicit "email isn't configured for this app —
  contact an administrator" message rather than pretending to send anything.

### Non-functional

- **NFR1** — Both request endpoints are rate-limited (reuse
  `AUTH_LIMITS`/`rateLimit()`) — password reset request is a classic
  enumeration/abuse target.
- **NFR2** — No behavior change when `REQUIRE_EMAIL_VERIFICATION=false`
  (default) — existing flows are unaffected.
- **NFR3** — Token verification stays `server-only`, never imported into
  edge/client code, consistent with `invite.ts` today.

## Design / approach

- The `purpose` column lets `verifyToken(token, hash, expires, purpose)`
  reject a password-reset token presented to the email-verify endpoint (and
  vice versa) — cheap defense against a token being replayed cross-purpose.
- Reset flow mirrors the invite-claim UX already built: same anti-enumeration
  message shape, same rate-limit helper, same "email is a safe no-op when
  disabled" gate.
- Email verification is sent automatically on registration when
  `EMAIL_ENABLED=true`; a "resend verification" action is available from
  Settings for a signed-in unverified user.
- The soft-gate design (FR5) is a deliberate choice: this boilerplate serves
  many different app types, and hard-blocking unverified users from a
  portfolio demo would frustrate reviewers testing the app. Apps that need a
  hard gate can flip the check from "block admin actions" to "block
  everything" in `proxy.ts`'s `ROLE_REQUIRED`-style map — documented as the
  extension point, not built as a second toggle.

## Acceptance criteria

- [x] Requesting a reset always returns the same message (`requestPasswordReset`
      returns `RESET_REQUESTED` whether or not the account exists; only accounts
      with a password are emailed). The `/forgot-password` UI shows one message.
- [x] A reset link older than 1 hour is rejected (`PASSWORD_RESET_TTL_MS` = 1h;
      `consumeVerificationToken` returns false when expired). Covered by the
      `tokens.ts` unit tests (expiry) + DB TTL.
- [x] A reset token is single-use — `consumeVerificationToken` deletes the row
      on use (even if expired), so a replay can't match.
- [x] With `REQUIRE_EMAIL_VERIFICATION=true`, an unverified user sees the banner
      (verified via screenshot) and admin mutations throw `ForbiddenError`
      (`requireEmailVerifiedIfEnforced` in the four admin mutations); `emailVerified`
      is set on confirm.
- [x] With email disabled, `/forgot-password` shows the "contact an
      administrator" message and sends nothing (e2e `password-reset.spec.ts`).
- [x] `invite.ts` → `tokens.ts` generalization has no behavior change — `invite.ts`
      now delegates to `tokens.ts` and the existing `invite.test.ts` still passes.
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build`
      pass.

Verification notes:

- Automated: token primitive (`tests/unit/tokens.test.ts`), invite regression
  (`tests/unit/invite.test.ts`), and route/UI + email-disabled behaviour
  (`tests/e2e/password-reset.spec.ts`).
- DB-verified: a reset request persists a `password-reset` token and
  registration persists an `email-verify` token — both stored as SHA-256
  hashes (raw token never stored), correctly purpose-scoped.
- Visual: the verify-email soft-gate banner renders for a fresh unverified user
  (screenshot).
- Not automated (needs a mail catcher): clicking the actual emailed link to
  complete a reset / verify end-to-end — verified manually. The token
  issuance, consume, expiry, single-use, and purpose-scoping logic underneath
  it is unit- and DB-verified.

## Security & privacy

- Anti-enumeration response shape matches the existing invite-claim and
  registration error messages (established precedent in this codebase).
- Tokens are stored hashed (SHA-256) and time-safe compared, never logged in
  plaintext.
- `purpose`-scoped tokens prevent a leaked verification-token from being
  replayed as a password-reset token.

## Alternatives considered

- **JWT-based reset tokens (no DB row)** — stateless, but can't be
  invalidated after use short of a blocklist, which reintroduces state
  anyway; the existing hashed-DB-token pattern is simpler and already proven.
- **Hard email-verification gate by default** — rejected; too strict a
  default for a boilerplate spanning many app types (see Design).

## Out of scope / future

- Session revocation on password reset (would require moving off pure JWT
  sessions or adding a token-version claim — a larger change, tracked as a
  future consideration, not blocking this spec).
- Passwordless magic-link sign-in.

## References

- [Roadmap](../README.md#roadmap).
- Deferred-hardening callout in
  [0006 — RBAC](0006-rbac.md#deferred-hardening-follow-ups).
- Reuses `verificationTokens` table already present since
  [0001](0001-project-foundation.md).
