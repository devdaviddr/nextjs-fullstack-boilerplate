import type { DefaultSession } from 'next-auth'

// Augment Auth.js types so `session.user.id` and `token.id` are typed
// everywhere they are used.
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
  }
}
