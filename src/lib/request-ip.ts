/**
 * Best-effort client IP from request headers.
 *
 * Order matters for correctness AND security behind a proxy:
 * 1. `CF-Connecting-IP` — set by Cloudflare, cannot be spoofed by the client
 *    (traffic only reaches the origin through Cloudflare). Preferred when the
 *    app runs behind a Cloudflare Tunnel.
 * 2. `X-Forwarded-For` (first hop) — spoofable if the app is directly exposed,
 *    so only meaningful behind a trusted proxy.
 * 3. `X-Real-IP`.
 *
 * Returns `'unknown'` when nothing usable is present (callers key rate limits
 * per IP; an `'unknown'` bucket degrades gracefully).
 */
export function clientIpFromHeaders(headers: Headers): string {
  const cf = headers.get('cf-connecting-ip')
  if (cf) return cf.trim()

  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()

  return headers.get('x-real-ip')?.trim() ?? 'unknown'
}
