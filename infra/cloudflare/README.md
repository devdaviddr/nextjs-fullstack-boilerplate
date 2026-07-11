# infra/cloudflare — Tunnel + DNS (Terraform)

Provisions the Cloudflare resources for the named-tunnel deployment: the tunnel,
its ingress config (`hostname → http://app:3000`), and a proxied DNS record. It
outputs the **tunnel token** the `cloudflared` container runs with.

Pinned to the Cloudflare provider **`~> 4.52`**. (On provider v5 the resource
names differ — `cloudflare_zero_trust_tunnel_cloudflared*`, `cloudflare_dns_record`.)

## Prerequisites

- Terraform ≥ 1.5
- A Cloudflare account with the domain's zone already added
- A scoped API token: **Account → Cloudflare Tunnel: Edit** and
  **Zone → DNS: Edit** (this zone only)

## Usage

```bash
cp terraform.tfvars.example terraform.tfvars   # then fill it in
terraform init
terraform plan
terraform apply
```

Then wire the token into the runtime (from the repo root):

```bash
make tunnel-provision   # runs apply + writes CLOUDFLARE_TUNNEL_TOKEN to .env
# set AUTH_URL=https://<hostname> in .env
make tunnel-up
```

Tear down with `terraform destroy` (or `make tunnel-destroy`).

## Notes

- `terraform.tfvars` and `*.tfstate*` are gitignored — state holds secrets. For
  teams, configure a remote backend (Cloudflare R2, S3, or Terraform Cloud).
- The API token is used **only at provision time**; the runtime holds only the
  tunnel token.
- This module is written against the documented v4 resources but has not been
  applied from this repo — run `terraform plan` and review before `apply`.
