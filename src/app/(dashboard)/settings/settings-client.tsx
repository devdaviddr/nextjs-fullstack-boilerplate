'use client'

import { CurrentUserCard } from '@/components/auth/current-user-card'
import { AdminPanel } from '@/components/auth/admin-panel'

interface SettingsClientProps {
  session: {
    user: {
      id: string
      name: string | null
      email: string
      roles: string[]
    }
  }
  users: Array<{
    id: string
    name: string | null
    email: string
    createdAt: Date
    roles: Array<{ id: string; name: string; description: string | null }>
    hasPassword: boolean
  }>
  roles: Array<{ id: string; name: string; description: string | null }>
  isAdmin: boolean
}

export function SettingsClient({
  session,
  users,
  roles,
  isAdmin,
}: SettingsClientProps) {
  const formattedRoles = roles.map((r) => ({ id: r.id, name: r.name }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <CurrentUserCard user={session.user} allRoles={formattedRoles} />

      {/* Server-authoritative gate — the admin server actions also enforce it. */}
      {isAdmin && (
        <AdminPanel
          initialUsers={users}
          allRoles={formattedRoles}
          currentUserId={session.user.id}
        />
      )}
    </div>
  )
}
