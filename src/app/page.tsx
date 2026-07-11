import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { auth } from '@/lib/auth'

export default async function HomePage() {
  const session = await auth()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Next.js Full-Stack Boilerplate
        </h1>
        <p className="text-muted-foreground mx-auto max-w-xl text-lg">
          Next.js 16 · Auth.js v5 · Drizzle ORM · Postgres · TypeScript ·
          Tailwind · Docker. Production-ready, batteries included.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {session?.user ? (
          <Button asChild size="lg">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        ) : (
          <>
            <Button asChild size="lg">
              <Link href="/register">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  )
}
