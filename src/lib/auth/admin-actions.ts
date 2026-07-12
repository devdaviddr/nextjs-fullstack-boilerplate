'use server'

import { eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { db } from '@/db'
import { users, roles, userRoles } from '@/db/schema'
import { requireRole, ForbiddenError } from '@/lib/auth/rbac'
import { AUTH_LIMITS, rateLimit } from '@/lib/rate-limit'
import { clientIpFromHeaders } from '@/lib/request-ip'
import { headers } from 'next/headers'
import {
  createUserSchema,
  updateUserSchema,
  assignRolesSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type AssignRolesInput,
} from '@/lib/validations/auth'
import { logger } from '@/lib/logger'

/** Get client IP for rate limiting. */
async function getClientIp(): Promise<string> {
  const h = await headers()
  return clientIpFromHeaders(h)
}

/** Rate limit key for admin actions. */
async function checkAdminRateLimit(action: string): Promise<void> {
  const ip = await getClientIp()
  const limited = rateLimit(
    `admin:${action}:${ip}`,
    AUTH_LIMITS.login.limit,
    AUTH_LIMITS.login.windowMs,
  )
  if (!limited.success) {
    logger.warn('Admin action rate limit exceeded', { action, ip })
    throw new Error('Too many requests. Please wait a moment.')
  }
}

/** Return type for user with roles. */
export interface UserWithRoles {
  id: string
  name: string | null
  email: string
  createdAt: Date
  roles: { id: string; name: string; description: string | null }[]
  hasPassword: boolean
}

/**
 * Get all users with their roles. Admin only.
 */
export async function getAllUsersWithRoles(): Promise<UserWithRoles[]> {
  // Read gated by requireRole('admin'); NOT rate limited — it runs on every
  // /settings render, so an auth-style limiter would lock admins out.
  await requireRole('admin')

  const allUsers = await db.query.users.findMany({
    with: {
      userRoles: {
        with: {
          role: true,
        },
      },
    },
    orderBy: (users, { desc }) => [desc(users.createdAt)],
  })

  const typedUsers = allUsers as Array<{
    id: string
    name: string | null
    email: string
    createdAt: Date
    userRoles: Array<{
      role: { id: string; name: string; description: string | null }
    }> | null
    hashedPassword: string | null
  }> | null

  return (typedUsers ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    createdAt: u.createdAt,
    roles: (u.userRoles ?? []).map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      description: ur.role.description,
    })),
    hasPassword: !!u.hashedPassword,
  }))
}

/**
 * Get all available roles. Admin only.
 */
export async function getAllRoles(): Promise<
  { id: string; name: string; description: string | null }[]
> {
  await requireRole('admin')

  const allRoles = await db.query.roles.findMany({
    orderBy: (roles, { asc }) => [asc(roles.name)],
  })

  return (allRoles ?? []).map(
    (r: { id: string; name: string; description: string | null }) => ({
      id: r.id,
      name: r.name,
      description: r.description,
    }),
  )
}

/**
 * Create a new user (admin). No password — user sets it on first login.
 * Admin only.
 */
export async function createUser(
  input: CreateUserInput,
): Promise<UserWithRoles> {
  await requireRole('admin')
  await checkAdminRateLimit('create-user')

  const parsed = createUserSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(', '))
  }

  const { name, email, roleIds } = parsed.data

  // Check email not taken
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true },
  })
  if (existing) {
    throw new Error('An account with this email already exists.')
  }

  // Verify all roleIds exist
  const validRoles = await db.query.roles.findMany({
    where: inArray(roles.id, roleIds),
    columns: { id: true },
  })
  if (validRoles.length !== roleIds.length) {
    throw new Error('One or more roles do not exist.')
  }

  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      hashedPassword: null, // No password — user sets on first login
    })
    .returning()

  if (!user) {
    throw new Error('Failed to create user')
  }

  // Assign roles
  await db
    .insert(userRoles)
    .values(roleIds.map((roleId) => ({ userId: user.id, roleId })))

  revalidatePath('/settings')
  logger.info('Admin created user', {
    adminId: (await getCurrentSession())?.user.id,
    userId: user.id,
  })

  // Return with roles
  const withRoles = (await db.query.users.findFirst({
    where: eq(users.id, user.id),
    with: { userRoles: { with: { role: true } } },
  })) as {
    id: string
    name: string | null
    email: string
    createdAt: Date
    userRoles: Array<{
      role: { id: string; name: string; description: string | null }
    }> | null
    hashedPassword: string | null
  } | null

  if (!withRoles) {
    throw new Error('Failed to retrieve created user')
  }

  return {
    id: withRoles.id,
    name: withRoles.name,
    email: withRoles.email,
    createdAt: withRoles.createdAt,
    roles: (withRoles.userRoles ?? []).map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      description: ur.role.description,
    })),
    hasPassword: false,
  }
}

/**
 * Update user name/email/roles (admin). Admin only.
 */
export async function updateUser(
  userId: string,
  input: UpdateUserInput,
): Promise<UserWithRoles> {
  await requireRole('admin')
  await checkAdminRateLimit('update-user')

  const parsed = updateUserSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(', '))
  }

  const session = await getCurrentSession()
  const currentUserId = session?.user.id

  // Prevent admin from changing their own email to a duplicate or removing own admin role
  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { userRoles: { with: { role: true } } },
  })

  if (!targetUser) {
    throw new Error('User not found.')
  }

  const { name, email, roleIds } = parsed.data

  // If email is changing, check uniqueness
  if (email && email !== targetUser.email) {
    const emailTaken = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true },
    })
    if (emailTaken) {
      throw new Error('An account with this email already exists.')
    }
  }

  // Update user
  const updateData: { name?: string; email?: string } = {}
  if (name !== undefined) updateData.name = name
  if (email !== undefined) updateData.email = email

  if (Object.keys(updateData).length > 0) {
    await db.update(users).set(updateData).where(eq(users.id, userId))
  }

  // Update roles if provided
  if (roleIds !== undefined) {
    // Verify all roles exist
    const validRoles = await db.query.roles.findMany({
      where: inArray(roles.id, roleIds),
      columns: { id: true },
    })
    if (validRoles.length !== roleIds.length) {
      throw new Error('One or more roles do not exist.')
    }

    // Prevent admin from removing own admin role
    if (userId === currentUserId) {
      const adminRole = await db.query.roles.findFirst({
        where: eq(roles.name, 'admin'),
        columns: { id: true },
      })
      if (adminRole && !roleIds.includes(adminRole.id)) {
        throw new ForbiddenError('Cannot remove your own admin role.')
      }
    }

    // Replace all roles
    await db.delete(userRoles).where(eq(userRoles.userId, userId))
    if (roleIds.length > 0) {
      await db
        .insert(userRoles)
        .values(roleIds.map((roleId) => ({ userId, roleId })))
    }
  }

  revalidatePath('/settings')
  logger.info('Admin updated user', {
    adminId: currentUserId,
    targetUserId: userId,
  })

  // Return updated user
  const updated = (await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { userRoles: { with: { role: true } } },
  })) as {
    id: string
    name: string | null
    email: string
    createdAt: Date
    userRoles: Array<{
      role: { id: string; name: string; description: string | null }
    }> | null
    hashedPassword: string | null
  } | null

  if (!updated) {
    throw new Error('Failed to retrieve updated user')
  }

  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    createdAt: updated.createdAt,
    roles: (updated.userRoles ?? []).map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      description: ur.role.description,
    })),
    hasPassword: !!updated.hashedPassword,
  }
}

/**
 * Delete a user (admin). Admin only.
 * Cannot delete self.
 */
export async function deleteUser(userId: string): Promise<void> {
  await requireRole('admin')
  await checkAdminRateLimit('delete-user')

  const session = await getCurrentSession()
  const currentUserId = session?.user.id

  if (userId === currentUserId) {
    throw new ForbiddenError('Cannot delete your own account.')
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true },
  })

  if (!targetUser) {
    throw new Error('User not found.')
  }

  // Cascade deletes userRoles via FK
  await db.delete(users).where(eq(users.id, userId))

  revalidatePath('/settings')
  logger.info('Admin deleted user', {
    adminId: currentUserId,
    targetUserId: userId,
  })
}

/**
 * Assign/replace all roles for a user (admin). Admin only.
 */
export async function assignRoles(input: AssignRolesInput): Promise<void> {
  await requireRole('admin')
  await checkAdminRateLimit('assign-roles')

  const parsed = assignRolesSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(', '))
  }

  const { userId, roleIds } = parsed.data

  // Verify user exists
  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true },
  })
  if (!targetUser) {
    throw new Error('User not found.')
  }

  // Verify all roles exist
  const validRoles = await db.query.roles.findMany({
    where: inArray(roles.id, roleIds),
    columns: { id: true },
  })
  if (validRoles.length !== roleIds.length) {
    throw new Error('One or more roles do not exist.')
  }

  const session = await getCurrentSession()
  const currentUserId = session?.user.id

  // Prevent admin from removing own admin role
  if (userId === currentUserId) {
    const adminRole = await db.query.roles.findFirst({
      where: eq(roles.name, 'admin'),
      columns: { id: true },
    })
    if (adminRole && !roleIds.includes(adminRole.id)) {
      throw new ForbiddenError('Cannot remove your own admin role.')
    }
  }

  // Replace all roles
  await db.delete(userRoles).where(eq(userRoles.userId, userId))
  if (roleIds.length > 0) {
    await db
      .insert(userRoles)
      .values(roleIds.map((roleId) => ({ userId, roleId })))
  }

  revalidatePath('/settings')
  logger.info('Admin assigned roles', {
    adminId: currentUserId,
    targetUserId: userId,
    roleIds,
  })
}

/**
 * Check if a user can complete registration (has pre-created account, no password).
 * Used by /register page to show appropriate UI.
 */
export async function canCompleteRegistration(email: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, hashedPassword: true },
  })
  return !!user && !user.hashedPassword
}

/**
 * Complete registration for a pre-created user (set password).
 * This is called from the register action when user already exists without password.
 */
export async function completeRegistration(
  email: string,
  password: string,
): Promise<void> {
  await checkAdminRateLimit('complete-registration')

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, hashedPassword: true },
  })

  if (!user) {
    throw new Error('Account not found.')
  }
  if (user.hashedPassword) {
    throw new Error('Account already has a password. Please sign in.')
  }

  // Hash password
  const { hashPassword } = await import('@/lib/auth/password')
  const hashed = await hashPassword(password)

  await db
    .update(users)
    .set({ hashedPassword: hashed })
    .where(eq(users.id, user.id))
  logger.info('User completed registration', { userId: user.id })
}

// Import getCurrentSession here to avoid circular dependency
import { getCurrentSession } from './session'
