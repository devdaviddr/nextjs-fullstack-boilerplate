output "tunnel_id" {
  description = "The Cloudflare tunnel ID."
  value       = cloudflare_tunnel.this.id
}

output "hostname" {
  description = "Public hostname the app is served on."
  value       = var.hostname
}

# The run token for the cloudflared container (`--token`). It is the base64 of
# {a: account, t: tunnel id, s: secret}. Consume via: make tunnel-provision.
output "tunnel_token" {
  description = "Set as CLOUDFLARE_TUNNEL_TOKEN for the cloudflared service."
  sensitive   = true
  value = base64encode(jsonencode({
    a = var.cloudflare_account_id
    t = cloudflare_tunnel.this.id
    s = random_bytes.tunnel_secret.base64
  }))
}
