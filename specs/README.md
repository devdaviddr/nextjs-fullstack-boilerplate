# Specs — Spec-Driven Development

[← Back to project README](../README.md)

This project uses **spec-driven development (SDD)**: non-trivial changes start
with a short written spec that captures the _what_ and _why_ before the _how_.
Specs make intent reviewable, keep scope honest, and give the codebase a
durable record of the decisions behind each release.

## When to write a spec

Write one for any **feature, cross-cutting change, or notable trade-off**
(new capability, security posture change, infra, breaking change). Skip it for
trivial fixes, dependency bumps, and copy edits — a good commit message is
enough there.

## Lifecycle

```
Proposed ──▶ Accepted ──▶ In Progress ──▶ Shipped
                 │                          │
                 └──▶ Rejected     Superseded ◀── (later spec replaces it)
```

- **Proposed** — drafted, open for discussion.
- **Accepted** — agreed; ready to build.
- **In Progress** — being implemented.
- **Shipped** — released; `release:` records the version.
- **Superseded / Rejected** — kept for history, status explains why.

## How to author one

1. Copy [`TEMPLATE.md`](TEMPLATE.md) to `NNNN-slug.md` (next free 4-digit id).
2. Fill it in; open it for review as `Proposed`.
3. On agreement, set `Accepted` and implement — ideally on a `feature/<slug>`
   branch (see the [gitflow workflow](../CONTRIBUTING.md)).
4. On release, set `Shipped`, fill `release:`, check the acceptance criteria,
   and add the matching [`CHANGELOG.md`](../CHANGELOG.md) entry.

**Spec vs changelog:** the spec is the intent _before_ (why/what/how); the
changelog is the record _after_ (what shipped, for users). They complement each
other — one isn't a substitute for the other.

## Index

| Spec                                         | Title                            | Status  | Release |
| -------------------------------------------- | -------------------------------- | ------- | ------- |
| [0001](0001-project-foundation.md)           | Project foundation               | Shipped | v0.1.0  |
| [0002](0002-pwa-and-app-shell.md)            | PWA & responsive app shell       | Shipped | v0.2.0  |
| [0003](0003-security-hardening.md)           | Production security hardening    | Shipped | v0.3.0  |
| [0004](0004-graphify-claude-integration.md)  | graphify & CLAUDE.md integration | Shipped | v0.3.1  |
| [0005](0005-cloudflare-tunnel-deployment.md) | Cloudflare Tunnel deployment     | Shipped | v0.4.0  |
| [0006](0006-rbac.md)                         | Role-based access control (RBAC) | Shipped | v0.5.0  |

> Specs 0001–0004 were written retroactively to document the decisions behind
> the existing releases; SDD is the going-forward process (0005 onward).
