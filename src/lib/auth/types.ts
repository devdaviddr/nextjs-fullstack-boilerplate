import type { DefaultSession, User as DefaultUser } from 'next-auth'
import type { DefaultJWT } from 'next-auth/jwt'

/**
 * Module augmentation for next-auth types.
 *
 * This file extends the built-in User, Session, and JWT types to include
 * the `roles` array. It is imported in config.ts (edge-safe) and index.ts
 * so the types flow through the entire auth system.
 */

declare module 'next-auth' {
  interface User extends DefaultUser {
    /** Role names assigned to this user (e.g., 'admin', 'member', 'viewer') */
    roles: string[]
  }

  interface Session {
    user: DefaultSession['user'] & {
      /** Role names assigned to the current user */
      roles: string[]
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    /** Role names assigned to the user */
    roles: string[]
  }
}
