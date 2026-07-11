import { defineConfig } from 'drizzle-kit'

// drizzle-kit runs outside Next.js, so load env vars from .env manually.
import { config } from 'dotenv'
config({ path: '.env' })

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for drizzle-kit. Set it in .env')
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
})
