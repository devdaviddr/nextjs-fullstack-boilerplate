---
id: 0014
title: Cloudflare Web Analytics
status: Proposed
release: '—'
created: 2026-07-13
updated: 2026-07-13
---

# 0014 — Cloudflare Web Analytics

## Summary

Add opt-in, cookie-free visitor analytics via Cloudflare's Web Analytics
beacon script, activated only when `CLOUDFLARE_ANALYTICS_TOKEN` is set. No
new infrastructure, no cookie-consent banner needed, and it ties naturally
into a stack that already runs everything through Cloudflare.

## Problem / motivation

An owner sharing a portfolio/POC link has no visibility into whether anyone
is actually visiting it. Cloudflare Web Analytics is free, requires no
account beyond one already in use for the Tunnel/DNS, and — unlike
Google Analytics — collects no cookies or personal data, so it doesn't
trigger the consent-banner requirements a heavier analytics product would.

## Goals

- Basic visitor/page-view visibility for a deployed app, opt-in.
- No cookies, no personal data, no consent banner required.
- Zero CSP loosening beyond the exact hosts the beacon needs.

## Non-goals

- Event/conversion tracking, funnels, or a full analytics product — this is
  page-view-level visibility only (what Cloudflare Web Analytics itself
  offers).
- Google Analytics or any cookie-based analytics — deliberately not chosen
  (see Alternatives).

## Requirements

### Functional

- **FR1** — `CLOUDFLARE_ANALYTICS_TOKEN` (optional) added to
  `src/lib/env.ts`. When unset, nothing analytics-related renders or loads.
- **FR2** — When set, the Cloudflare beacon script
  (`https://static.cloudflareinsights.com/beacon.min.js`) is injected in
  root `layout.tsx` via `next/script`, tagged with the token.
- **FR3** — Works identically whether the app is reached via a quick tunnel
  (`*.trycloudflare.com`) or a named-tunnel custom domain — the beacon is a
  client-side script, not dependent on Cloudflare's edge proxy being
  in front of the specific request.

### Non-functional

- **NFR1** — `proxy.ts`'s `buildCsp()` only adds
  `script-src https://static.cloudflareinsights.com` and
  `connect-src https://cloudflareinsights.com` when the token is configured
  — the default (analytics off) CSP is unchanged and stays maximally strict.
- **NFR2** — No cookies are set by this feature (verified — Cloudflare Web
  Analytics is cookie-free by design, unlike the orange-cloud proxy
  analytics product, which this is not).
- **NFR3** — Script uses `next/script`'s `afterInteractive` strategy so it
  never blocks initial page render.

## Design / approach

- `buildCsp()` in `src/proxy.ts` currently returns a fixed directive set; add
  the two conditional host allowances only inside the
  `env.CLOUDFLARE_ANALYTICS_TOKEN` branch, keeping the function's default
  output byte-identical when analytics is off (regression-tested).
- The beacon script itself needs no nonce (it's loaded from an external host
  by src, not inline), so it composes cleanly with the existing
  `'strict-dynamic'` nonce-based policy without further changes.
- Injected once in root `layout.tsx`, conditionally rendered based on
  `env.CLOUDFLARE_ANALYTICS_TOKEN` being present.

## Acceptance criteria

- [ ] With the token unset, no analytics script is rendered and CSP is
      byte-identical to before this spec (diffed).
- [ ] With the token set, the beacon script loads and CSP includes exactly
      the two added host allowances, nothing broader.
- [ ] No cookies are set by the app that weren't set before (verified via a
      browser dev-tools check / Playwright cookie assertion).
- [ ] Works when accessed via `make tunnel-quick`'s ephemeral URL.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass.

## Security & privacy

- Cookie-free by design — the reason this was chosen over Google Analytics,
  which would require a consent banner for GDPR/ePrivacy compliance that
  this boilerplate doesn't otherwise need.
- CSP additions are scoped to exactly the two Cloudflare Insights hosts, not
  a wildcard.

## Alternatives considered

- **Google Analytics** — far more capable, but cookie-based, requiring a
  consent-management flow this boilerplate doesn't otherwise need — rejected
  as disproportionate for "mid-range, not too much."
- **Self-hosted Plausible/Umami** — privacy-friendly like Cloudflare's
  option, but adds another long-running container + its own database to a
  single-box deployment for marginal benefit over a free product already
  integrated with the existing Cloudflare account. Documented as a future
  option if someone wants owned analytics data.
- **No analytics at all** — valid for a pure demo, but the roadmap
  explicitly called this out as wanted.

## Out of scope / future

- Self-hosted analytics (Plausible/Umami).
- Custom event tracking.

## References

- [Roadmap](../README.md#roadmap).
- [Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/).
