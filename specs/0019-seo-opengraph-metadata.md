---
id: 0019
title: SEO & OpenGraph metadata
status: Proposed
release: '—'
created: 2026-07-13
updated: 2026-07-13
---

# 0019 — SEO & OpenGraph metadata

## Summary

Give the boilerplate proper share-link metadata: a `metadataBase`, OpenGraph
and Twitter card tags, a default OG image, and baseline SEO primitives
(`robots`, `sitemap`, canonical). Today a link to any fork renders as a bare
title with no preview card — a real cost for a boilerplate whose forks are
_meant_ to be shared (portfolio demos linked from a CV, LinkedIn, or a DM).

## Problem / motivation

`src/app/layout.tsx` sets `title`, `description`, `applicationName`, and PWA
metadata, but has **no `metadataBase`, no `openGraph`, and no `twitter`
block** — so every shared link shows a blank grey rectangle instead of a
preview card. For a portfolio boilerplate this is the highest-value cheap gap:
every fork gets shared as a URL, and link unfurls on social/chat are the first
impression a reviewer gets before they ever click. There is also no `robots`
route and no `sitemap`, so crawlers get no guidance.

## Goals

- Shared links to a fork render a rich preview card (title, description,
  image) on the common unfurlers (Slack, iMessage, LinkedIn, X, Discord).
- Zero-config default that looks correct out of the box, overridable per fork
  via one env var and one image swap.
- Per-route metadata (e.g. a page can set its own OG title/description) keeps
  working through Next's `Metadata` merge — no bespoke plumbing.

## Non-goals

- Per-page dynamically-generated OG images (e.g. `@vercel/og` runtime image
  composition) — a static default image is enough for the boilerplate; dynamic
  images are a per-fork enhancement.
- Structured data / JSON-LD, analytics, or any keyword/SEO-content work — this
  is technical share-metadata only.

## Requirements

### Functional

- **FR1** — `src/app/layout.tsx` `metadata` gains `metadataBase` (derived from
  an app-URL env var), an `openGraph` block (type, siteName, title,
  description, image), and a matching `twitter` block (`summary_large_image`).
- **FR2** — A default static OG image (1200×630) ships in the repo and is
  referenced by the metadata; replacing it per fork requires no code change.
- **FR3** — `robots` and `sitemap` are provided via Next's file conventions
  (`src/app/robots.ts`, `src/app/sitemap.ts`), driven by the same app-URL.
- **FR4** — The canonical/base URL comes from a single validated env var so a
  fork sets it once; absent in dev, it falls back to a sensible local default.

### Non-functional

- **NFR1** — New env var is added to both `src/lib/env.ts` (Zod-validated) and
  `.env.example`, per the repo convention; it is optional with a safe default
  so zero-config still boots.
- **NFR2** — No new runtime dependency — this uses Next 16's built-in
  `Metadata`/file-route conventions only.

## Design / approach

- Add e.g. `APP_URL` (or reuse `AUTH_URL` if semantically appropriate — decide
  during implementation) to `src/lib/env.ts`; use it for `metadataBase`,
  `robots`, and `sitemap`. Keep it optional with a `http://localhost:3000`
  dev default so nothing breaks unconfigured.
- Extend the existing `metadata` object in `src/app/layout.tsx` rather than
  introducing a second metadata source; per-route `metadata` exports continue
  to merge/override as today.
- Ship the default OG image under `public/` (or `src/app/opengraph-image.*`
  using Next's file convention) and document the one-line swap in `docs/`.

## Acceptance criteria

- [ ] A deployed fork's URL unfurls with a title, description, and image card
      on at least Slack and one social platform.
- [ ] `metadataBase` is set so relative OG image URLs resolve absolutely.
- [ ] `/robots.txt` and `/sitemap.xml` are served and reference the configured
      app URL.
- [ ] With no app-URL env var set, dev build still boots and uses the local
      default (regression-tested).
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass.

## Security & privacy

- No new PII or secrets — the app URL is public by definition; the OG image is
  a static asset. `robots`/`sitemap` intentionally expose only public routes.

## Alternatives considered

- **Dynamic per-route OG images (`@vercel/og`)** — nicer output, but adds
  runtime cost and complexity for marginal benefit at the boilerplate level; a
  static default covers the "shared link looks good" goal. Left as a per-fork
  enhancement.
- **Leave metadata as-is** — cheapest, but forgoes the single highest-value
  first-impression win for a boilerplate whose forks exist to be shared.

## Out of scope / future

- JSON-LD structured data, sitemaps for dynamic/user content, and analytics —
  separate concerns, not planned here.

## References

- Existing metadata in `src/app/layout.tsx` (title/description/PWA only, no OG).
- Descoped predecessor draft 0008 (SEO metadata) — re-scoped and prioritised
  here for the portfolio use case; 0008's number is not reused.
- [Next.js Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata).
