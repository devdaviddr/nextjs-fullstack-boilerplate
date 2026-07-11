import NextAuth from 'next-auth'

import { authConfig } from '@/lib/auth/config'

// Next.js 16 renamed the edge "middleware" convention to "proxy". This runs on
// the edge runtime using only the edge-safe config (no DB, no argon2); route
// protection logic lives in `authConfig.callbacks.authorized`.
export default NextAuth(authConfig).auth

export const config = {
  /**
   * Run on every path except Next.js internals, static assets, and common
   * public files. The auth API route is excluded so Auth.js can handle it.
   */
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)',
  ],
}
