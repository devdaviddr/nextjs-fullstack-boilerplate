#!/usr/bin/env sh
# Verify a Cloudflare Tunnel deployment.
#
#   URL=https://app.example.com ./scripts/tunnel-verify.sh
#   ./scripts/tunnel-verify.sh https://app.example.com
#
# Checks: the app is reachable over HTTPS, the DB-backed health probe is green,
# and the edge is serving hardening headers (HSTS / CSP).
set -eu

URL="${1:-${URL:-}}"
if [ -z "$URL" ]; then
  echo "Usage: URL=https://your-host $0   (or pass the URL as an argument)" >&2
  exit 2
fi
URL="${URL%/}"

fail=0

printf '→ GET %s/api/health\n' "$URL"
code=$(curl -fsS -o /tmp/tunnel_health -w '%{http_code}' "$URL/api/health" 2>/dev/null || echo 000)
if [ "$code" = "200" ] && grep -q '"db":"up"' /tmp/tunnel_health 2>/dev/null; then
  echo "  ✓ health 200, db up"
else
  echo "  ✗ health check failed (HTTP $code)"
  fail=1
fi
rm -f /tmp/tunnel_health

printf '→ security headers\n'
headers=$(curl -fsSI "$URL" 2>/dev/null || true)
echo "$headers" | grep -qi '^strict-transport-security:' && echo "  ✓ HSTS" || { echo "  ✗ HSTS missing"; fail=1; }
echo "$headers" | grep -qi '^content-security-policy:' && echo "  ✓ CSP" || { echo "  ✗ CSP missing"; fail=1; }

if [ "$fail" -eq 0 ]; then
  echo "✓ Tunnel deployment looks healthy."
else
  echo "✗ Some checks failed." >&2
  exit 1
fi
