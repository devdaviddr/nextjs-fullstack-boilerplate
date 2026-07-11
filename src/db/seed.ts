import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { hash } from '@node-rs/argon2'
import { users } from './schema'

// Idempotent dev seed — safe to run repeatedly. Never run against production.
config({ path: '.env' })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required to seed')

const DEMO = {
  name: 'Demo User',
  email: 'demo@example.com',
  password: 'Password123',
}

async function main() {
  const client = postgres(databaseUrl!, { max: 1 })
  const db = drizzle(client, { schema: { users } })

  const existing = await db.query.users.findFirst({
    where: eq(users.email, DEMO.email),
  })

  if (existing) {
    console.log(`ℹ️  Demo user already exists (${DEMO.email})`)
  } else {
    const hashedPassword = await hash(DEMO.password, {
      memoryCost: 19_456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    })
    await db.insert(users).values({
      name: DEMO.name,
      email: DEMO.email,
      hashedPassword,
    })
    console.log(`✅ Seeded demo user: ${DEMO.email} / ${DEMO.password}`)
  }

  await client.end()
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Seed failed', err)
  process.exit(1)
})
