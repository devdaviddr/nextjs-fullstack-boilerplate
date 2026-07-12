import 'server-only'

import { getCurrentSession } from './session'

/**
 * Thrown when a server action or handler requires a role the user doesn't have.
 * Catch this in a try/catch and return an appropriate error response.
 */
export class ForbiddenError extends Error {
  constructor(message = 'Insufficient permissions') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

/**
 * Assert that the current session user has at least one of the allowed roles.
 * Throws ForbiddenError if the check fails.
 *
 * Usage in a Server Action:
 *   export async function myAdminAction() {
 *     await requireRole('admin')
 *     // ... admin-only logic
 *   }
 */
export async function requireRole(...allowed: string[]): Promise<void> {
  const session = await getCurrentSession()
  if (!session?.user.roles?.some((r) => allowed.includes(r))) {
    throw new ForbiddenError()
  }
}

/**
 * Return the first matching role from the allowed list, or throw.
 * Useful when you need to know *which* role matched for branching logic.
 *
 * Usage:
 *   const role = await requireAnyRole('admin', 'member')
 *   if (role === 'admin') { ... }
 */
export async function requireAnyRole(...allowed: string[]): Promise<string> {
  const session = await getCurrentSession()
  const match = session?.user.roles?.find((r) => allowed.includes(r))
  if (!match) throw new ForbiddenError()
  return match
}

/**
 * Check if the current user has a role without throwing.
 * Returns true/false for conditional logic.
 */
export async function hasRole(...allowed: string[]): Promise<boolean> {
  const session = await getCurrentSession()
  return session?.user.roles?.some((r) => allowed.includes(r)) ?? false
}
