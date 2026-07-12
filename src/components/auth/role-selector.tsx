'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface RoleSelectorProps {
  value: string[]
  onChange: (value: string[]) => void
  options: Array<{ id: string; name: string }>
  disabled?: boolean
  className?: string
}

export function RoleSelector({
  value,
  onChange,
  options,
  disabled,
  className,
}: RoleSelectorProps) {
  const handleChange = (roleId: string, checked: boolean) => {
    if (checked) {
      onChange([...value, roleId])
    } else {
      onChange(value.filter((id) => id !== roleId))
    }
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((role) => (
        <label
          key={role.id}
          className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded border p-2 text-sm transition-colors"
        >
          <Checkbox
            checked={value.includes(role.id)}
            onCheckedChange={(checked) =>
              handleChange(role.id, checked as boolean)
            }
            disabled={disabled}
          />
          <span>{role.name}</span>
        </label>
      ))}
    </div>
  )
}

interface RoleBadgesProps {
  roleIds: string[]
  allRoles: Array<{ id: string; name: string }>
  className?: string
}

export function RoleBadges({ roleIds, allRoles, className }: RoleBadgesProps) {
  const roles = roleIds
    .map((id) => allRoles.find((r) => r.id === id))
    .filter(Boolean) as Array<{ id: string; name: string }>

  if (roles.length === 0) {
    return (
      <Badge variant="secondary" className={className}>
        No roles
      </Badge>
    )
  }

  return (
    <div className={className}>
      {roles.map((role) => (
        <Badge
          key={role.id}
          variant={role.name === 'admin' ? 'destructive' : 'default'}
        >
          {role.name}
        </Badge>
      ))}
    </div>
  )
}
