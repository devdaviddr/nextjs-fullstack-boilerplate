import 'server-only'

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { env } from '@/lib/env'
import * as schema from './schema'

/**
 * Single pooled postgres-js client per process. In development Next.js clears
 * the module cache on every hot reload, which would otherwise open a new pool
 * on each save and exhaust connections — so we stash the client on globalThis.
 */
const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof postgres> | undefined
}

const client =
  globalForDb.client ??
  postgres(env.DATABASE_URL, {
    max: env.NODE_ENV === 'production' ? 10 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
  })

if (env.NODE_ENV !== 'production') {
  globalForDb.client = client
}

export const db = drizzle(client, {
  schema,
  logger: env.NODE_ENV === 'development',
})

export { schema }
export type Database = typeof db
