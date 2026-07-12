---
id: 0008
title: SEO & public-facing metadata
status: Proposed
release: '—'
created: 2026-07-13
updated: 2026-07-13
---

# 0008 — SEO & public-facing metadata

## Summary

Give every app forked from this boilerplate correct, easily-customizable
public-facing metadata: Open Graph / Twitter cards, a canonical URL, a
generated `sitemap.xml` and `robots.txt`, and explicit `noindex` on
authenticated routes. Centralize the editable bits (site name, description, OG
image) in one config file so forking a new POC means editing one file, not
hunting through `layout.tsx`, `manifest.ts`, and page metadata separately.

## Problem / motivation

This boilerplate is meant to be shown to visitors (spec goal: "self-hosted...
so people can view projects"), but today `src/app/layout.tsx` has only a
title/description — no `metadataBase`, no Open Graph/Twitter tags, no
`sitemap.ts`/`robots.ts`, and no `noindex` on `/dashboard` or `/settings`. A
link shared to a forked portfolio app currently renders with no preview card,
and search engines have no sitemap and no signal to skip private routes.

## Goals

- A shared link to any app built on this boilerplate renders a correct OG/
  Twitter preview card out of the box.
- `sitemap.xml` and `robots.txt` are generated, not hand-maintained.
- Authenticated routes are excluded from indexing.
- Forking for a new project requires editing one config file for site name,
  description, URL, and OG image.

## Non-goals

- Structured data / JSON-LD schema markup (follow-up if needed).
- Per-page dynamic OG image generation (`opengraph-image.tsx` with
  `ImageResponse`) — start with a static image; dynamic generation is a
  documented future option.
- Analytics or SEO ranking tooling — this spec is purely correct metadata.

## Requirements

### Functional

- **FR1** — `src/lib/site-config.ts`: single source of truth for
  `siteName`, `description`, `url` (from `NEXT_PUBLIC_SITE_URL`), and the OG
  image path. `layout.tsx`, `manifest.ts`, `sitemap.ts`, and `robots.ts` all
  import from it.
- **FR2** — `metadataBase` set in root `layout.tsx`; Open Graph
  (`og:title`, `og:description`, `og:image`, `og:type`) and Twitter Card
  (`summary_large_image`) metadata added.
- **FR3** — `public/og-image.png` (1200×630) as the default static OG image,
  documented as the first thing to swap when forking for a new project.
- **FR4** — `src/app/sitemap.ts` (Next.js file convention) listing public
  routes only (`/`, `/login`, `/register`) — dashboard/settings excluded.
- **FR5** — `src/app/robots.ts` disallowing `/dashboard`, `/settings`,
  `/api/`, and `/403`; allowing everything else; pointing at the sitemap.
- **FR6** — Per-page `robots: { index: false, follow: false }` metadata on
  `/dashboard`, `/settings`, `/login`, `/register`, `/403` as defense in depth
  (belt-and-suspenders alongside `robots.ts`, since crawlers that ignore
  `robots.txt` still respect page-level meta).

### Non-functional

- **NFR1** — Zero new dependencies — everything here is Next.js's built-in
  Metadata API and file conventions.
- **NFR2** — `NEXT_PUBLIC_SITE_URL` is Zod-validated in `src/lib/env.ts`
  (required in production, since a missing `metadataBase` silently degrades
  OG image URLs to relative paths that most crawlers won't resolve).

## Design / approach

- `site-config.ts` exports a plain object; no runtime logic. This is the file
  the README should point to as step one of forking for a new project.
- `metadataBase: new URL(siteConfig.url)` in `layout.tsx` makes every relative
  URL in `metadata` (OG image, canonical) resolve correctly without
  hardcoding the domain in multiple places.
- `sitemap.ts`/`robots.ts` are static (no DB reads) — this boilerplate has no
  public content routes yet beyond the marketing/login pages, so a hardcoded
  list is correct today; forks that add public content pages extend the same
  file.
- Reuses the existing `AUTH_URL` value as a fallback for `NEXT_PUBLIC_SITE_URL`
  where they'd otherwise be identical, but keeps them as separate env vars
  since `AUTH_URL` is auth-specific (Auth.js cookie/redirect trust) and
  conflating the two would make a future split (e.g. app on a different
  subdomain than the marketing site) harder.

## Acceptance criteria

- [ ] Pasting the deployed URL into Slack/Discord/X renders a title,
      description, and image preview.
- [ ] `curl /sitemap.xml` and `curl /robots.txt` return valid output listing
      only public routes.
- [ ] `curl /dashboard` (unauthenticated, redirected to `/login`, but checking
      the login page's own meta) and a signed-in fetch of `/dashboard` both
      carry `noindex`.
- [ ] Forking the repo and changing only `src/lib/site-config.ts` +
      `public/og-image.png` is sufficient to rebrand all metadata surfaces
      (documented + spot-checked).
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass.

## Security & privacy

- No new data collection. `sitemap.ts`/`robots.ts` reveal only already-public
  route paths, not user data.
- Ensuring authenticated routes are `noindex` prevents search engines from
  surfacing login-walled URLs as if they were public content.

## Alternatives considered

- **Dynamic `opengraph-image.tsx` per route** — nicer (per-page preview
  images) but adds `next/og` rendering complexity; deferred until a fork
  actually needs per-page cards.
- **`next-seo` package** — a popular Pages-Router-era helper; the App Router's
  built-in Metadata API covers everything needed here without an extra
  dependency.

## Out of scope / future

- Dynamic OG image generation.
- JSON-LD structured data.
- Localized metadata (depends on [0016](0016-i18n.md) if that ships).

## References

- [Roadmap](../README.md#roadmap).
- [Next.js Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata).
