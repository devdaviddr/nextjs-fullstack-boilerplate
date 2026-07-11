import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { SignOutButton } from '@/components/auth/sign-out-button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { auth } from '@/lib/auth'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await auth()

  // Defence in depth: middleware already guards this route, but never trust a
  // page to be reached only through the middleware.
  if (!session?.user) {
    redirect('/login')
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <SignOutButton />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>You are signed in</CardTitle>
          <CardDescription>
            This route is protected by middleware and a server-side session
            check.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Name:</span>{' '}
            {session.user.name}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span>{' '}
            {session.user.email}
          </p>
          <p>
            <span className="text-muted-foreground">User ID:</span>{' '}
            <code className="text-xs">{session.user.id}</code>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
