# Self-hosting

[← Back to README](../README.md)

Take this boilerplate from a fresh clone to a live app on **your own domain** —
served over HTTPS through a **Cloudflare Tunnel**, with no open ports, no reverse
proxy, and no certificate management. One command does the whole thing:

```bash
make setup
```

This guide is the **journey** (clone → live). For per-command reference and the
individual `make tunnel-*` targets, see [deployment.md](deployment.md); for the
CI pipeline see [ci-cd.md](ci-cd.md); for day-2 data safety see
[backups.md](backups.md).

---

## What `make setup` does

`make setup` runs [`scripts/setup.sh`](../scripts/setup.sh), a guided wizard that
**orchestrates the existing deployment primitives** — it doesn't replace them.
Each step is announced before it runs:

```text
preflight ─▶ secrets (.env, AUTH_SECRET) ─▶ choose mode
   ├─ quick     → trycloudflare.com URL (no account)
   ├─ guided    → your domain, token pasted from the dashboard
   └─ automated → your domain, provisioned by Terraform
                          │
     seed demo admin ─────┴─▶ verify (health + HSTS + CSP) ─▶ summary (URL + login)
```

It is **idempotent** — safe to re-run. It never rotates an existing
`AUTH_SECRET` without asking (rotation logs everyone out and voids outstanding
password-reset/verification tokens), and it writes `.env` and any Terraform vars
`chmod 600`, never printing secrets.

---

## Prerequisites

| Requirement         | For                | Notes                                                           |
| ------------------- | ------------------ | --------------------------------------------------------------- |
| Docker + Compose    | all modes          | Compose **≥ v2.24** (the tunnel overlays use a newer merge).    |
| `openssl`           | all modes          | Generates `AUTH_SECRET`. Present on macOS/Linux by default.     |
| A Cloudflare domain | guided / automated | A domain added to your Cloudflare account (free plan is fine).  |
| `terraform`         | automated only     | Provisions the tunnel + DNS.                                    |
| A scoped API token  | automated only     | **Account → Cloudflare Tunnel: Edit** and **Zone → DNS: Edit**. |

Cloudflare Tunnel itself is free (Zero Trust free tier). Windows: run inside WSL.

---

## Choose your mode

### 1. Quick — instant demo, no account

Best for kicking the tyres. You get a random public
`https://<something>.trycloudflare.com` URL that lasts as long as the stack runs.

```bash
make setup            # pick "quick"
# → prints the live URL, seeds demo@example.com / Password123, verifies
```

The URL is **ephemeral** — every quick run gets a new one. Use a named tunnel
(below) for anything stable.

### 2. Guided — your domain, token from the dashboard

You create the tunnel by hand in Cloudflare and paste its token; the wizard wires
the rest.

1. Cloudflare **Zero Trust → Networks → Tunnels → Create a tunnel** (Cloudflared).
2. Copy the **token** it shows.
3. Add a **public hostname**: `app.yourdomain.com` → `http://app:3000`
   (Cloudflare creates the DNS record for you).
4. Run `make setup`, pick **guided**, and paste the token + hostname.

The wizard stores the token in `.env`, sets `AUTH_URL=https://app.yourdomain.com`
(the single most-missed manual step), brings the stack up, seeds, and verifies.

### 3. Automated — your domain, provisioned by Terraform

The wizard collects four Cloudflare inputs, writes
`infra/cloudflare/terraform.tfvars` (0600), and runs the Terraform module that
creates the tunnel, its ingress, and the DNS record — then starts everything.

```bash
make setup            # pick "automated"
#   Cloudflare API token …
#   account id … / zone id … / hostname app.yourdomain.com
# → terraform apply → tunnel up → seed → verify → live URL
```

Find your **account ID** and **zone ID** on the domain's overview page in the
Cloudflare dashboard. Create the API token under **My Profile → API Tokens** with
the two scopes listed in Prerequisites.

---

## Non-interactive / scripted

Every prompt can be supplied via the environment, for CI or repeatable installs:

```bash
# Quick, unattended:
SETUP_MODE=quick SETUP_YES=1 make setup

# Automated, unattended:
SETUP_MODE=automated SETUP_YES=1 \
  CF_API_TOKEN=cf_xxx CF_ACCOUNT_ID=… CF_ZONE_ID=… \
  TUNNEL_HOSTNAME=app.yourdomain.com \
  make setup
```

| Variable                  | Mode             | Purpose                            |
| ------------------------- | ---------------- | ---------------------------------- |
| `SETUP_MODE`              | all              | `quick` \| `guided` \| `automated` |
| `SETUP_YES=1`             | all              | Assume "yes" to confirmations      |
| `NO_SEED=1`               | all              | Skip seeding the demo admin        |
| `CLOUDFLARE_TUNNEL_TOKEN` | guided           | Dashboard-issued tunnel token      |
| `TUNNEL_HOSTNAME`         | guided/automated | Public hostname                    |
| `CF_API_TOKEN`            | automated        | Scoped Cloudflare API token        |
| `CF_ACCOUNT_ID`           | automated        | Cloudflare account ID              |
| `CF_ZONE_ID`              | automated        | Zone ID of the domain              |

Run `./scripts/setup.sh --help` for the same summary.

---

## Deploy with an AI agent (Claude Code / opencode)

This repo ships a **`self-host` skill** for both [Claude Code](https://claude.ai/code)
and [opencode](https://opencode.ai), so you can just tell your agent _"self-host
this on my domain"_ and it drives the flow for you — picking the right mode,
collecting your Cloudflare inputs, running the wizard, and verifying.

| Tool        | Skill location (in this repo)         |
| ----------- | ------------------------------------- |
| Claude Code | `.claude/skills/self-host/SKILL.md`   |
| opencode    | `.opencode/skills/self-host/SKILL.md` |

Both are the same [Agent Skill](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
format and are picked up automatically when you open this project in the
respective tool — no install step. The skill is a thin runbook over
`make setup`: it never prints secrets, never rotates an existing `AUTH_SECRET`
without asking, and hands off to this guide for the details. Invoke it explicitly
with `/self-host`, or just describe the goal ("deploy this to `app.mydomain.com`")
and let the agent trigger it.

> The skill **orchestrates**; it doesn't bypass anything here. Everything it runs
> is a command you can run yourself from this page.

---

## Continuous deployment

`make setup` gets you live the first time; **continuous deployment** keeps a
running box up to date as you push new code. CI already builds a production image
on every green run — CD just ships it. Because the box is **outbound-only** (the
tunnel opens no inbound ports), both paths below are **pull-based**: the box
reaches out for the new image; nothing reaches in.

On merge to `main` (and on `v*` release tags), [`ci.yml`](../.github/workflows/ci.yml)
publishes two images to the GitHub Container Registry, **only after `quality` +
`e2e` pass**:

- `ghcr.io/<owner>/<repo>` — the app (production `runner` image).
- `ghcr.io/<owner>/<repo>/migrate` — the migrator (`builder` image; the app image
  can't run migrations itself).

### Tier B (recommended) — pull with `make deploy`

Point the box at the published image and update with one command. In the box's
`.env`:

```bash
APP_IMAGE="ghcr.io/your-org/nextjs-fullstack-boilerplate"
APP_TAG="latest"        # or pin a release, e.g. v0.14.0
```

Then, to update:

```bash
make deploy    # docker compose pull → up -d  (prod + deploy + tunnel overlays)
```

`make deploy` pulls both images, runs the one-shot **migrate** (it gates the app
via `depends_on`, so schema changes apply **before** the new app starts), then
restarts the app behind the tunnel — **no building on the box**. Run it by hand,
or from `cron` / a `launchd` timer for scheduled updates. If the package is
private, `docker login ghcr.io` once on the box with a read-only PAT.

**Rollback** is just re-pinning: set `APP_TAG` to the previous version (or a
commit `sha` tag) and run `make deploy` again.

### Tier C (optional) — push-button on tag, via a self-hosted runner

For true "tag a release → it deploys itself", register your box as a **GitHub
self-hosted runner** and enable the shipped [`deploy.yml`](../.github/workflows/deploy.yml):

1. Add a self-hosted runner on the box (GitHub → Settings → Actions → Runners).
   The runner **dials out** to GitHub, so it works behind the tunnel.
2. Set the repo variable `SELF_HOSTED_DEPLOY = true` (Settings → Secrets and
   variables → Actions → Variables). Until you do, `deploy.yml` is skipped.
3. Push a `v*` tag — the runner runs `make deploy` on the box.

> ⚠️ A self-hosted runner executes workflow code on your network. Use it only on
> a **private** repo (or one where you trust every tag), and prefer an
> **ephemeral** runner. Tier B (pull) avoids this entirely — it's the default for
> a reason.

### Note on Watchtower

[Watchtower](https://containrrr.dev/watchtower/) can auto-pull the updated `app`
container, but it **won't run the one-shot `migrate`** — so it silently skips
schema changes and is only safe for migration-free releases. Prefer `make deploy`,
which always migrates first. If you use Watchtower anyway, run migrations
yourself on any release that changes the schema.

---

## Day-2 operations

```bash
# Follow logs (app + cloudflared):
docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml logs -f

make tunnel-down     # stop the tunnel stack (keeps data)
make tunnel-up       # start it again

# Update to a newer cloudflared:
docker compose -f docker-compose.prod.yml -f docker-compose.tunnel.yml pull cloudflared
make tunnel-up
```

- **Backups** — the production stack runs nightly Postgres + MinIO backup
  sidecars; restore runbook in [backups.md](backups.md).
- **Re-verify anytime** — `URL=https://app.yourdomain.com make tunnel-verify`.
- **Teardown** — `docker compose -f docker-compose.prod.yml down -v` removes
  containers and data; in automated mode, `make tunnel-destroy` also removes the
  Cloudflare tunnel + DNS record.

---

## Troubleshooting

| Symptom                         | Fix                                                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Preflight: Compose too old**  | Upgrade Docker Desktop / the compose plugin to ≥ v2.24.                                                                                |
| **Port 3000 already in use**    | Only affects the plain `docker-compose.prod.yml`; tunnel modes publish no host port. Stop the other process (e.g. a stray `pnpm dev`). |
| **502 / Bad gateway**           | App not ready yet, or the ingress target is wrong — it must be `http://app:3000` (the Compose service name), never `localhost`.        |
| **Login loop / cookies drop**   | `AUTH_URL` must be the exact public `https://…` URL and `AUTH_TRUST_HOST=true` (both set for you by the wizard).                       |
| **Tunnel won't connect**        | Check the token (`make tunnel-token`) and `cloudflared` logs; a token is bound to one tunnel.                                          |
| **Quick URL changed**           | It's ephemeral by design — use guided/automated for a stable domain.                                                                   |
| **Rate limiting sees wrong IP** | Traffic must arrive via Cloudflare so `CF-Connecting-IP` is present; direct origin hits won't have it.                                 |

---

## How it works (one diagram)

```text
User ──HTTPS──▶  Cloudflare edge  ◀══ outbound tunnel ══  cloudflared ──▶ app:3000
                 (terminates TLS)                          (in Docker)
```

`cloudflared` dials **out** to Cloudflare and holds the connection open; no
inbound ports are opened on your host. Auth trusts the proxied host
(`AUTH_TRUST_HOST` + `AUTH_URL`) and reads the real client IP from
`CF-Connecting-IP`. Deeper detail: [architecture.md](architecture.md) and
[deployment.md](deployment.md).
