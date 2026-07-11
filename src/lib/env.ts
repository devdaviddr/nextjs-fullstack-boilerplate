import { z } from 'zod'

/**
 * Centralised, validated environment access.
 *
 * Importing this module fails fast (at boot) with a readable error if a
 * required variable is missing or malformed, instead of surfacing a cryptic
 * `undefined` deep inside a request. Keep this file dependency-free (only
 * `zod`) so it is safe to import from any runtime, including the edge.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection URL'),
  AUTH_SECRET: z
    .string()
    .min(1, 'AUTH_SECRET is required — generate one with `npx auth secret`'),
  AUTH_URL: z.string().url().optional(),
  AUTH_TRUST_HOST: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n')
  throw new Error(`❌ Invalid environment variables:\n${issues}`)
}

export const env = parsed.data
export type Env = typeof env
