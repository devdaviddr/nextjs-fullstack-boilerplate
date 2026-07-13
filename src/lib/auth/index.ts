import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { eq, inArray } from 'drizzle-orm'
import NextAuth from 'next-auth'
import type { Provider } from 'next-auth/providers'
import Credentials from 'next-auth/providers/credentials'
import GitHub from 'next-auth/providers/github'
import Google from 'next-auth/providers/google'

import { db } from '@/db'
import {
  accounts,
  authenticators,
  sessions,
  users,
  roles,
  userRoles,
  verificationTokens,
} from '@/db/schema'
import { authConfig } from './config'
import { fakeVerifyPassword, verifyPassword } from './password'
import { isGithubConfigured, isGoogleConfigured } from './providers'
import { bootstrapNewUserRole } from './roles'
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
 * The Credentials provider drives our own /login and /register UI. It needs the
 * database and argon2, so it lives here in the Node config, never the edge one.
 */
const credentialsProvider = Credentials({
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
})

/**
 * Providers are assembled conditionally: Credentials is always present; GitHub
 * and Google are added only when their env vars are configured. `false` for
 * `allowDangerousEmailAccountLinking` (the Auth.js default, set explicitly for
 * intent) means an OAuth sign-in whose email matches an existing account is NOT
 * auto-merged — the user must sign in first and link from Settings. Implicit
 * linking on an attacker-controlled email is a known account-takeover vector.
 */
const providers: Provider[] = [credentialsProvider]
if (isGithubConfigured()) {
  providers.push(GitHub({ allowDangerousEmailAccountLinking: false }))
}
if (isGoogleConfigured()) {
  providers.push(Google({ allowDangerousEmailAccountLinking: false }))
}

/**
 * Full, Node-runtime Auth.js instance. Composes the edge-safe `authConfig`
 * with the Credentials provider (which needs the database and argon2), the
 * Drizzle adapter (for OAuth account/user persistence), and any configured
 * OAuth providers.
 *
 * `session.strategy` stays `'jwt'` (inherited from authConfig). Auth.js would
 * otherwise flip to database sessions once an adapter is present — which would
 * break `proxy.ts`'s edge route protection, since that reads the JWT with zero
 * DB round-trips.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
    authenticatorsTable: authenticators,
  }),
  events: {
    // Fires once, only for adapter-created (OAuth) users.
    async createUser({ user }) {
      if (!user.id) return
      // Assign the bootstrap role so a fresh OAuth deployment has a working admin.
      await bootstrapNewUserRole(user.id)
      // GitHub/Google verify email ownership before issuing their token, so an
      // OAuth account is already email-verified — but the providers don't map
      // `emailVerified` themselves, so we set it here. Without this, an OAuth
      // user would be needlessly nagged by the REQUIRE_EMAIL_VERIFICATION soft
      // gate despite a provider-verified email.
      await db
        .update(users)
        .set({ emailVerified: new Date() })
        .where(eq(users.id, user.id))
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    /** Populate roles on the JWT at sign-in and refresh on session update. */
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        // Credentials `authorize` returns roles inline; OAuth adapter users
        // don't, leaving this undefined so the DB fetch below runs for them.
        token.roles = user.roles
        token.picture = user.image ?? null
      }
      // Back-fill id from `sub` so pre-RBAC tokens self-heal instead of showing
      // a blank id and no roles.
      token.id ??= token.sub
      // Fetch roles on an explicit session update, when a token has none yet,
      // or on a fresh OAuth sign-in (roles assigned in events.createUser).
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
  providers,
})
