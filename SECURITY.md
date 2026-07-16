# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Report privately via [GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
(the **Security → Report a vulnerability** tab on the repository), or email the
maintainer. You can expect an initial response within a few business days.

Please include steps to reproduce, affected versions, and any relevant logs.

## Supported versions

This is a boilerplate/template. Security fixes are applied to `main`; consumers
should track it and update their fork.

## Security posture

Built-in protections (see [docs/architecture.md](docs/architecture.md#security-model)):

- Argon2id password hashing; passwords never stored in plaintext.
- HTTP-only, encrypted JWT session cookies (Auth.js).
- Rate limiting on login/registration — per-account (IP+email) plus a global
  per-IP login cap, enforced non-bypassably in the credentials `authorize`
  callback.
- Hardened response headers incl. a nonce-based Content-Security-Policy, HSTS,
  and `X-Frame-Options: DENY`.
- Environment validation at boot; the app refuses to start misconfigured.
- Non-root Docker image.

Before going to production, review the checklist in
[docs/usage.md](docs/usage.md#production-checklist).
