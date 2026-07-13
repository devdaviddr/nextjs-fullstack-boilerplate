import type { NextAuthConfig } from 'next-auth'

// Import types to trigger module augmentation
import './types'

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
    /** Persist the user id, roles, and avatar onto the JWT at sign-in. */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.roles = user.roles ?? []
        token.picture = user.image ?? null
      }
      // Back-fill id from the standard `sub` claim so tokens issued before RBAC
      // existed still resolve an id (the Node jwt in ./index.ts refreshes roles).
      token.id ??= token.sub
      return token
    },
    /** Expose the user id, roles, and avatar on the session object for the client/server. */
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id ?? token.sub) as string
        session.user.roles = (token.roles as string[] | undefined) ?? []
        // Explicit rather than relying on next-auth's default token->session
        // merge, since `token.picture` is the field this app actively
        // refreshes (jwt callback, `trigger === 'update'`) after a
        // profile-photo change (spec 0018).
        session.user.image =
          (token.picture as string | null | undefined) ?? null
      }
      return session
    },
  },
} satisfies NextAuthConfig
