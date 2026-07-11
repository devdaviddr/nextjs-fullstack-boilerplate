import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

// Standalone migration runner — invoked by `pnpm db:migrate` and the Docker
// entrypoint. Runs outside Next.js, so load .env explicitly.
config({ path: '.env' })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run migrations')
}

async function main() {
  // A dedicated single-connection client; `max: 1` is required for migrations.
  const migrationClient = postgres(databaseUrl!, { max: 1 })
  const db = drizzle(migrationClient)

  console.log('⏳ Running migrations...')
  const start = Date.now()
  await migrate(db, { migrationsFolder: './drizzle' })
  console.log(`✅ Migrations complete in ${Date.now() - start}ms`)

  await migrationClient.end()
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Migration failed')
  console.error(err)
  process.exit(1)
})
