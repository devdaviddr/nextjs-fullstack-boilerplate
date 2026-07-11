# Deployment — Cloudflare Tunnel

[← Back to README](../README.md)

Expose the Docker container on a Cloudflare-managed domain over HTTPS via
**Cloudflare Tunnel** — no open ports, no reverse proxy, no certificate
management. The `cloudflared` daemon makes an outbound-only connection to
Cloudflare's edge, which terminates TLS and routes traffic back down the tunnel.

This keeps the existing stack (`docker-compose.prod.yml`: app + db + migrator)
unchanged; the tunnel is an opt-in overlay.

Three on-ramps, all converging on the same runtime:

| Path                      | Command                                     | Cloudflare account? |
| ------------------------- | ------------------------------------------- | ------------------- |
| **Quick tunnel** (demo)   | `make tunnel-quick`                         | ❌ none             |
| **Guided** (dashboard)    | see [Option B](#option-b--guided-dashboard) | ✅                  |
| **Automated** (Terraform) | `make tunnel-provision && make tunnel-up`   | ✅ + API token      |

> In tunnel modes the app has **no published host ports** — it's reachable only
> through the tunnel.

## Prerequisites

- Docker + Docker Compose (v2.24+ for the `!reset` override).
- A `.env` with at least `AUTH_SECRET` and `DATABASE_URL` (see [`.env.example`](../.env.example)).
- For named tunnels: a domain on Cloudflare and (for the automated path) a
  scoped API token — **Account → Cloudflare Tunnel: Edit**, **Zone → DNS: Edit**.

## Quick tunnel (no account)

Instant public preview on a random `*.trycloudflare.com` URL:

```bash
make tunnel-quick
```

The URL is printed in the `cloudflared` logs. `AUTH_TRUST_HOST=true` (set in the
compose app) makes auth work on the random hostname.

## Option A — Automated (Terraform)

Provisions the tunnel, its ingress, and the DNS record, then wires the token in.

```bash
cp infra/cloudflare/terraform.tfvars.example infra/cloudflare/terraform.tfvars
# edit terraform.tfvars: api token, account id, zone id, hostname

make tunnel-provision          # terraform apply + writes CLOUDFLARE_TUNNEL_TOKEN to .env
# set AUTH_URL=https://<hostname> in .env
make tunnel-up                 # start the stack behind the tunnel
URL=https://<hostname> make tunnel-verify
```

Details and the token scopes are in [`infra/cloudflare/`](../infra/cloudflare/README.md).
Tear down with `make tunnel-destroy`.

## Option B — Guided (dashboard)

Produces the same `CLOUDFLARE_TUNNEL_TOKEN` + DNS record by hand:

1. Zero Trust → **Networks → Tunnels → Create a tunnel** (Cloudflared). Copy the
   **token** it shows.
2. Put it in `.env` as `CLOUDFLARE_TUNNEL_TOKEN`, and set
   `AUTH_URL=https://app.yourdomain.com`.
3. Add a **public hostname**: `app.yourdomain.com` → `http://app:3000`
   (Cloudflare creates the DNS record automatically).
4. Start it and verify:

   ```bash
   make tunnel-up
   URL=https://app.yourdomain.com make tunnel-verify
   ```

## How the app runs behind the tunnel

- **`AUTH_TRUST_HOST=true`** + **`AUTH_URL`** so Auth.js trusts the proxied host
  and issues secure cookies over HTTPS.
- **Client IP** is read from `CF-Connecting-IP` (set by Cloudflare, unspoofable)
  for rate limiting — see `src/lib/request-ip.ts`.
- HSTS / CSP / hardening headers are served from the origin as usual.

## Notes

- Cloudflare Tunnel is free (Zero Trust free tier).
- For production, use managed Postgres and a remote Terraform state backend.
- Optional: gate the app (or staging) with **Cloudflare Access** for an
  edge SSO layer in front of the app's own auth.
