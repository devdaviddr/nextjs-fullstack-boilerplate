import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'

import { InstallPrompt } from '@/components/pwa/install-prompt'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import { ThemeProvider } from '@/components/theme/theme-provider'
import './globals.css'

const APP_NAME = 'Next.js Full-Stack Boilerplate'

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: '%s · Boilerplate',
  },
  description:
    'Production-grade Next.js boilerplate with Auth.js, Drizzle, and Postgres.',
  // iOS home-screen / standalone behaviour.
  appleWebApp: {
    capable: true,
    title: 'Boilerplate',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // `cover` lets content extend under the notch; safe-area insets are handled
  // in the app shell so nothing is obscured.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The per-request CSP nonce is set on the request headers in `src/proxy.ts`.
  // Thread it into next-themes so its anti-flash inline script runs under the
  // strict production CSP without loosening `script-src`.
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <ThemeProvider nonce={nonce}>
          {children}
          <ServiceWorkerRegister />
          <InstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  )
}
