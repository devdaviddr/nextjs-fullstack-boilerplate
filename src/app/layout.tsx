import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Next.js Full-Stack Boilerplate',
    template: '%s · Boilerplate',
  },
  description:
    'Production-grade Next.js boilerplate with Auth.js, Drizzle, and Postgres.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
