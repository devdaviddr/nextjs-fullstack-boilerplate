import { redirect } from 'next/navigation'

import { AppShell } from '@/components/shell/app-shell'
import { getCurrentSession } from '@/lib/auth/session'

// Wraps all protected pages in the app shell. Also enforces auth at the layout
// level (defense in depth on top of the edge proxy).
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getCurrentSession()
  if (!session?.user) {
    redirect('/login')
  }

  return (
    <AppShell user={{ name: session.user.name, email: session.user.email }}>
      {children}
    </AppShell>
  )
}
