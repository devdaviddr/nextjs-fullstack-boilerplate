import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getCurrentSession } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await getCurrentSession()

  // The shell layout already guards this route; re-check as defense in depth.
  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <Card>
        <CardHeader>
          <CardTitle>You are signed in</CardTitle>
          <CardDescription>
            This route is protected by the edge proxy and a server-side session
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
    </div>
  )
}
