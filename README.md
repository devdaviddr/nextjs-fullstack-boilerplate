<div align="center">

# Next.js Full-Stack Boilerplate

A production-grade starting point for full-stack web apps — authentication, database, PWA, Docker, and CI wired up and tested, so you can start building features on day one.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-20232a?logo=react&logoColor=61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169e1?logo=postgresql&logoColor=white)
![Auth.js](https://img.shields.io/badge/Auth.js-v5-000000?logo=auth0&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-ready-5a0fc8?logo=pwa&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)

</div>

---

## What it is

An opinionated, batteries-included template built on **Next.js 16** (App Router, RSC, Server Actions) with:

- 🔐 **Email + password auth** via Auth.js v5 — Argon2id hashing, JWT sessions, edge-protected routes
- 🗄️ **PostgreSQL + Drizzle ORM** — type-safe schema, committed migrations
- 📱 **PWA + responsive app shell** — installable, offline-resilient, mobile-to-desktop layout
- 🧪 **Tested** — Vitest units + Playwright E2E, green in CI
- 🐳 **Docker + CI** — multi-stage image, GitHub Actions pipeline
- 🛡️ **Strict TypeScript**, ESLint, Prettier, and pre-commit hooks

Everything is verified end to end — auth flow, container, and PWA all proven working, not just scaffolded. See **[Features](docs/features.md)** for the full list.

## Quick start

**Prerequisites:** Node ≥ 20.9 (22 recommended) · [pnpm](https://pnpm.io) (`corepack enable`) · Docker

```bash
# 1. Install
pnpm install

# 2. Configure environment
cp .env.example .env
npx auth secret            # generates AUTH_SECRET — paste into .env

# 3. Start Postgres, apply schema, seed a demo user
pnpm docker:db
pnpm db:migrate
pnpm db:seed                # → demo@example.com / Password123

# 4. Run
pnpm dev                    # http://localhost:3000
```

Sign in with the demo account, or register a new one at `/register`.
For the installable PWA (service worker is production-only): `pnpm build && pnpm start`.

## Documentation

| Doc                                         | What's inside                                                |
| ------------------------------------------- | ------------------------------------------------------------ |
| 📋 **[Features](docs/features.md)**         | Complete feature list and what's included                    |
| 🏛️ **[Architecture](docs/architecture.md)** | Request flow, auth design, security model, project structure |
| 🗄️ **[Database](docs/database.md)**         | Schema, migrations, Drizzle workflow, seeding                |
| 📱 **[PWA & App Shell](docs/pwa.md)**       | Manifest, service worker strategy, icons, responsive shell   |
| 🛠️ **[Usage & Development](docs/usage.md)** | Scripts, env vars, testing, Docker, extending the app        |
| 🚀 **[Deployment](docs/deployment.md)**     | Cloudflare Tunnel — quick, guided, and Terraform paths       |
| 📐 **[Specs](specs/README.md)**             | Spec-driven development — one spec per feature/release       |

## Tech stack

| Layer      | Choice                                                     |
| ---------- | ---------------------------------------------------------- |
| Framework  | Next.js 16 · React 19 · TypeScript 5.9 (strict)            |
| Auth       | Auth.js (NextAuth) v5 — Credentials + JWT, Argon2id        |
| Database   | PostgreSQL 17 · Drizzle ORM + drizzle-kit                  |
| UI         | Tailwind CSS v4 · shadcn/ui · lucide-react                 |
| Validation | Zod (shared client/server schemas)                         |
| Testing    | Vitest + Testing Library · Playwright                      |
| Tooling    | ESLint (flat) · Prettier · Husky · lint-staged             |
| Delivery   | Multi-stage Docker (standalone, non-root) · GitHub Actions |

## Project structure

```
src/
├── app/            # App Router: (auth) + (dashboard) groups, api/, PWA manifest & offline
├── components/     # auth · pwa · shell · ui (shadcn)
├── db/             # Drizzle schema, client, migrate & seed scripts
├── lib/            # auth (config/actions/session), validations, env, shell nav, utils
└── proxy.ts        # edge route protection (Next 16 "proxy" convention)
```

Full tree and rationale in **[Architecture](docs/architecture.md)**.

## Deployment

Serve the Docker stack on a Cloudflare domain via **Cloudflare Tunnel** — no
open ports, no reverse proxy, no certs. An instant public preview needs no
Cloudflare account:

```bash
make tunnel-quick   # → https://<random>.trycloudflare.com
```

For a custom domain there are guided (dashboard) and one-command (Terraform)
paths. Full setup and usage: **[Deployment](docs/deployment.md)**.

## Roadmap

- [x] Credentials auth · Drizzle/Postgres · Docker · CI · PWA · responsive app shell
- [x] Auth rate limiting · nonce CSP + HSTS · structured-logging shim
- [ ] OAuth providers (GitHub, Google) — schema is already adapter-ready
- [ ] Email verification & password reset
- [ ] Role-based access control (RBAC)
- [ ] Web Push notifications (service-worker hooks are in place)
- [ ] Shared-store rate limiting (Upstash) & error tracking (Sentry)
- [ ] Dark-mode toggle & theming
- [ ] Internationalization (i18n)

## Contributing

Commits run ESLint + Prettier via a Husky `pre-commit` hook. Before opening a PR:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

See **[Usage & Development](docs/usage.md)** for the full workflow.

## License

Released under the [MIT License](LICENSE).
