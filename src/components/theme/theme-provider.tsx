'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * Thin client wrapper around `next-themes`. Kept as its own client component so
 * the root layout (a server component) can stay server-rendered and only this
 * boundary ships to the client.
 *
 * The `nonce` is threaded through from the root layout, which reads it from the
 * `x-nonce` request header set in `src/proxy.ts`. `next-themes` injects a
 * blocking inline script to set the theme class before first paint (the
 * anti-flash mechanism); passing the per-request nonce lets that script run
 * under the strict production CSP (`script-src 'self' 'nonce-…' 'strict-dynamic'`)
 * without loosening it.
 */
export function ThemeProvider({
  children,
  nonce,
}: {
  children: React.ReactNode
  nonce?: string
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      nonce={nonce}
    >
      {children}
    </NextThemesProvider>
  )
}
