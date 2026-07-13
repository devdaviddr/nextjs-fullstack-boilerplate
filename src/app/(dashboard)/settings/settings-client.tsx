'use client'

import { CurrentUserCard } from '@/components/auth/current-user-card'
import { AdminPanel } from '@/components/auth/admin-panel'
import { ConnectedAccounts } from '@/components/auth/connected-accounts'
import { FilesPanel } from '@/components/files/files-panel'
import { NotificationsPanel } from '@/components/push/notifications-panel'
import type { LinkedAccountsState } from '@/lib/auth/account-actions'
import type { FileSummary } from '@/lib/storage/actions'

interface SettingsClientProps {
  session: {
    user: {
      id: string
      name: string | null
      email: string
      image: string | null | undefined
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
  files: FileSummary[]
  linkedAccounts: LinkedAccountsState
  pushPublicKey: string | null
  isAdmin: boolean
}

export function SettingsClient({
  session,
  users,
  roles,
  files,
  linkedAccounts,
  pushPublicKey,
  isAdmin,
}: SettingsClientProps) {
  const formattedRoles = roles.map((r) => ({ id: r.id, name: r.name }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <CurrentUserCard user={session.user} allRoles={formattedRoles} />

      <FilesPanel initialFiles={files} />

      <ConnectedAccounts state={linkedAccounts} />

      {pushPublicKey && <NotificationsPanel publicKey={pushPublicKey} />}

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
