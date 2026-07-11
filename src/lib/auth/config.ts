import type { NextAuthConfig } from 'next-auth'

/**
 * Edge-safe Auth.js configuration.
 *
 * This file must NOT import the database, argon2, or any Node-only module,
 * because it is consumed by `middleware.ts` which runs on the edge runtime.
 * The Credentials provider (which needs both) is added only in the full,
 * Node-side config in `./index.ts`.
 */

/** Routes that require an authenticated session. */
const PROTECTED_PREFIXES = ['/dashboard']

/** Auth pages an already-signed-in user should be redirected away from. */
const AUTH_ROUTES = ['/login', '/register']

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Providers are added in ./index.ts; keep this empty for the edge bundle.
  providers: [],
  callbacks: {
    /**
     * Runs in middleware for every matched request. Return `false` (or a
     * Response) to block; Auth.js redirects unauthenticated users to signIn.
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const { pathname } = nextUrl

      const isProtected = PROTECTED_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
      )
      if (isProtected) return isLoggedIn

      // Signed-in users shouldn't see login/register — bounce to dashboard.
      if (isLoggedIn && AUTH_ROUTES.includes(pathname)) {
        return Response.redirect(new URL('/dashboard', nextUrl))
      }

      return true
    },
    /** Persist the user id onto the JWT at sign-in. */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    /** Expose the user id on the session object for the client/server. */
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
} satisfies NextAuthConfig
