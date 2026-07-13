import 'server-only'

import { count, eq } from 'drizzle-orm'

import { db } from '@/db'
import { roles, userRoles, users } from '@/db/schema'
import { logger } from '@/lib/logger'

/**
 * Assign the bootstrap role to a newly-created user: the very first user in a
 * fresh deployment becomes `admin`, everyone after is a `member`. This mirrors
 * the intent of the dev seed (which hands the demo user `admin`) and gives an
 * OAuth-only deployment a working admin without a manual DB step.
 *
 * Invoked from the Auth.js `events.createUser` hook, which only fires for
 * adapter-created (OAuth) users — credentials registration creates users
 * directly and is intentionally left unchanged.
 */
export async function bootstrapNewUserRole(userId: string): Promise<void> {
  // The user has already been inserted by the adapter, so a total of 1 means
  // this is the first-ever account.
  const [row] = await db.select({ value: count() }).from(users)
  const userCount = row?.value ?? 0

  const roleName = userCount <= 1 ? 'admin' : 'member'

  const role = await db.query.roles.findFirst({
    where: eq(roles.name, roleName),
  })

  if (!role) {
    // Roles are created by `db:seed`; if they're missing the deployment was
    // never seeded. Log loudly rather than throwing (which would abort the
    // whole sign-in) — the user can still be granted a role by an admin later.
    logger.error('Bootstrap role missing — run db:seed', { roleName, userId })
    return
  }

  await db
    .insert(userRoles)
    .values({ userId, roleId: role.id })
    .onConflictDoNothing()
}
