'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Mail, User } from 'lucide-react'
import { AvatarUpload } from '@/components/auth/avatar-upload'
import { RoleBadges } from '@/components/auth/role-selector'

interface CurrentUserCardProps {
  user: {
    id: string
    name: string | null
    email: string
    image: string | null | undefined
    roles: string[]
  }
  allRoles: Array<{ id: string; name: string }>
}

export function CurrentUserCard({ user, allRoles }: CurrentUserCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Current User
        </CardTitle>
        <CardDescription>
          Your account information and assigned roles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AvatarUpload name={user.name} image={user.image} />
        <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-muted-foreground text-sm font-medium">
              Name
            </Label>
            <p>{user.name ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground text-sm font-medium">
              Email
            </Label>
            <p className="flex items-center gap-2">
              <Mail className="text-muted-foreground h-4 w-4" />
              {user.email}
            </p>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-muted-foreground text-sm font-medium">
              User ID
            </Label>
            <code className="bg-muted rounded px-2 py-1 text-xs">
              {user.id}
            </code>
          </div>
        </div>
        <div className="space-y-2 border-t pt-2">
          <Label className="text-muted-foreground text-sm font-medium">
            Roles
          </Label>
          {/* Convert role names to role IDs for RoleBadges component */}
          <RoleBadges
            roleIds={user.roles
              .map((roleName) => {
                const role = allRoles.find((r) => r.name === roleName)
                return role?.id ?? ''
              })
              .filter(Boolean)}
            allRoles={allRoles}
          />
        </div>
      </CardContent>
    </Card>
  )
}
