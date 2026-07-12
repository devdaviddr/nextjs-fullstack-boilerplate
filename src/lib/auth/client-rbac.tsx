'use client'

import { useSession } from 'next-auth/react'

/**
 * Hook to access the current user's roles from the session.
 * Returns an empty array if no session or no roles.
 *
 * Usage:
 *   const roles = useRole()
 *   const isAdmin = roles.includes('admin')
 */
export function useRole(): string[] {
  const { data: session } = useSession()
  return session?.user?.roles ?? []
}

/**
 * Wrapper component that conditionally renders children based on role.
 * If the user doesn't have any of the required roles, renders `fallback`
 * (default: null, i.e. nothing).
 *
 * Usage:
 *   <RequireRole roles={['admin']} fallback={<AccessDenied />}>
 *     <AdminPanel />
 *   </RequireRole>
 */
interface RequireRoleProps {
  roles: string[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function RequireRole({
  roles,
  fallback = null,
  children,
}: RequireRoleProps) {
  const userRoles = useRole()
  const hasRole = roles.some((r) => userRoles.includes(r))
  return hasRole ? <>{children}</> : <>{fallback}</>
}
