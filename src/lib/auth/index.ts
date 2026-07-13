import { eq, inArray } from 'drizzle-orm'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

import { db } from '@/db'
import { users, roles, userRoles } from '@/db/schema'
import { authConfig } from './config'
import { fakeVerifyPassword, verifyPassword } from './password'
import { logger } from '@/lib/logger'
import { AUTH_LIMITS, rateLimit } from '@/lib/rate-limit'
import { clientIpFromHeaders } from '@/lib/request-ip'
import { loginSchema } from '@/lib/validations/auth'

// Import types to trigger module augmentation
import './types'

/** Best-effort client IP from a Request's proxy headers. */
function ipFromRequest(request: Request | undefined): string {
  return request ? clientIpFromHeaders(request.headers) : 'unknown'
}

/**
 * Fetch role names for a user from the database.
 * Used in authorize() and jwt callback to populate token.roles.
 */
async function getUserRoles(userId: string): Promise<string[]> {
  const userRoleRows = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId))

  if (userRoleRows.length === 0) return []

  const roleIds = userRoleRows.map((r) => r.roleId)
  const roleRows = await db
    .select({ name: roles.name })
    .from(roles)
    .where(inArray(roles.id, roleIds))

  return roleRows.map((r) => r.name)
}

/** Current `image` column for a user — used to refresh the JWT after a profile-photo change. */
async function getUserImage(userId: string): Promise<string | null> {
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { image: true },
  })
  return row?.image ?? null
}

/**
 * Full, Node-runtime Auth.js instance. Composes the edge-safe `authConfig`
 * with the Credentials provider (which needs the database and argon2).
 *
 * To add OAuth later: import `DrizzleAdapter` from `@auth/drizzle-adapter`,
 * pass `adapter: DrizzleAdapter(db)`, and add providers such as GitHub/Google.
 * The database schema is already adapter-compatible.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    /** Populate roles on the JWT at sign-in and refresh on session update. */
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.roles = user.roles ?? []
        token.picture = user.image ?? null
      }
      // Back-fill id from `sub` so pre-RBAC tokens self-heal instead of showing
      // a blank id and no roles.
      token.id ??= token.sub
      // Fetch roles on an explicit session update, or when a token has none yet.
      if ((trigger === 'update' || token.roles === undefined) && token.id) {
        token.roles = await getUserRoles(token.id as string)
      }
      // Refresh the avatar on an explicit session update too (e.g. after a
      // profile-photo upload/removal) — same trigger, sibling fetch.
      if (trigger === 'update' && token.id) {
        token.picture = await getUserImage(token.id as string)
      }
      return token
    },
  },
  providers: [
    Credentials({
      // We drive our own /login and /register UI, so no default form fields.
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        // Non-bypassable rate limit: this runs for the form action AND direct
        // POSTs to /api/auth/callback/credentials. Keyed separately from the
        // server action so the two entry points don't double-decrement.
        const ip = ipFromRequest(request)
        const limited = rateLimit(
          `authz:${ip}:${email}`,
          AUTH_LIMITS.login.limit,
          AUTH_LIMITS.login.windowMs,
        )
        if (!limited.success) {
          logger.warn('Login rate limit exceeded (authorize)', { ip })
          await fakeVerifyPassword(password)
          return null
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        })

        // No account, or an OAuth-only account with no password set.
        if (!user?.hashedPassword) {
          await fakeVerifyPassword(password)
          return null
        }

        const isValid = await verifyPassword(user.hashedPassword, password)
        if (!isValid) return null

        const userRolesArray = await getUserRoles(user.id)

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          roles: userRolesArray,
        }
      },
    }),
  ],
})
