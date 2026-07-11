variable "cloudflare_api_token" {
  type        = string
  sensitive   = true
  description = "Scoped API token — Account → Cloudflare Tunnel:Edit, Zone → DNS:Edit."
}

variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare account ID."
}

variable "cloudflare_zone_id" {
  type        = string
  description = "Zone ID of the domain that hosts `hostname`."
}

variable "hostname" {
  type        = string
  description = "Public hostname routed to the app, e.g. app.example.com."
}

variable "tunnel_name" {
  type        = string
  default     = "nextjs-boilerplate"
  description = "Name for the Cloudflare tunnel."
}

variable "service" {
  type        = string
  default     = "http://app:3000"
  description = "Internal service the tunnel forwards to (Docker network address)."
}
