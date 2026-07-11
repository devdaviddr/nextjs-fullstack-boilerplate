import { eq } from 'drizzle-orm'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

import { db } from '@/db'
import { users } from '@/db/schema'
import { authConfig } from './config'
import { fakeVerifyPassword, verifyPassword } from './password'
import { loginSchema } from '@/lib/validations/auth'

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
  providers: [
    Credentials({
      // We drive our own /login and /register UI, so no default form fields.
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

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

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        }
      },
    }),
  ],
})
