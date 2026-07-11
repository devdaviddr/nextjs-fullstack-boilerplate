import { describe, expect, it } from 'vitest'

import { clientIpFromHeaders } from '@/lib/request-ip'

const h = (init: Record<string, string>) => new Headers(init)

describe('clientIpFromHeaders', () => {
  it('prefers CF-Connecting-IP (unspoofable behind Cloudflare)', () => {
    expect(
      clientIpFromHeaders(
        h({
          'cf-connecting-ip': '203.0.113.7',
          'x-forwarded-for': '10.0.0.1',
          'x-real-ip': '10.0.0.2',
        }),
      ),
    ).toBe('203.0.113.7')
  })

  it('falls back to the first X-Forwarded-For hop', () => {
    expect(
      clientIpFromHeaders(h({ 'x-forwarded-for': '198.51.100.5, 10.0.0.1' })),
    ).toBe('198.51.100.5')
  })

  it('falls back to X-Real-IP', () => {
    expect(clientIpFromHeaders(h({ 'x-real-ip': '198.51.100.9' }))).toBe(
      '198.51.100.9',
    )
  })

  it('returns "unknown" when no IP header is present', () => {
    expect(clientIpFromHeaders(h({}))).toBe('unknown')
  })
})
