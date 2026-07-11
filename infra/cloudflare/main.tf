provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Random secret backing the tunnel; also forms the `s` field of the run token.
resource "random_bytes" "tunnel_secret" {
  length = 32
}

# The tunnel itself. `config_src = "cloudflare"` keeps ingress config remote
# (managed by cloudflare_tunnel_config below) so the daemon runs with just a token.
resource "cloudflare_tunnel" "this" {
  account_id = var.cloudflare_account_id
  name       = var.tunnel_name
  secret     = random_bytes.tunnel_secret.base64
  config_src = "cloudflare"
}

# Ingress: route the public hostname to the internal app service; 404 otherwise.
resource "cloudflare_tunnel_config" "this" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_tunnel.this.id

  config {
    ingress_rule {
      hostname = var.hostname
      service  = var.service
    }
    ingress_rule {
      service = "http_status:404"
    }
  }
}

# DNS: proxied CNAME from the hostname to the tunnel's edge address.
resource "cloudflare_record" "tunnel" {
  zone_id = var.cloudflare_zone_id
  name    = var.hostname
  type    = "CNAME"
  content = "${cloudflare_tunnel.this.id}.cfargotunnel.com"
  proxied = true
}
