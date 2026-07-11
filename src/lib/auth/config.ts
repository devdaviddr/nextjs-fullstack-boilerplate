import type { NextAuthConfig } from 'next-auth'

/**
 * Edge-safe Auth.js configuration.
 *
 * This file must NOT import the database, argon2, or any Node-only module,
 * because it is consumed by `proxy.ts` which runs on the edge runtime. The
 * Credentials provider (which needs both) is added only in the full, Node-side
 * config in `./index.ts`. Route protection lives in `proxy.ts`.
 */
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
