import { z } from 'zod'

/**
 * Centralised, validated environment access.
 *
 * Importing this module fails fast (at boot) with a readable error if a
 * required variable is missing or malformed, instead of surfacing a cryptic
 * `undefined` deep inside a request. Keep this file dependency-free (only
 * `zod`) so it is safe to import from any runtime, including the edge.
 */
/** Treat unset AND empty-string env vars as "not provided". */
const optionalStr = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v))

const envSchema = z
  .object({
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

    // --- Email (opt-in) ---------------------------------------------------
    // Everything email-related is OFF unless EMAIL_ENABLED=true AND a provider
    // (SMTP) is configured. See src/lib/email/. SMTP is provider-agnostic:
    // Resend / SendGrid / Mailgun / SES / Gmail all expose SMTP credentials.
    EMAIL_ENABLED: z
      .string()
      .optional()
      .transform((v) => v === 'true'),
    EMAIL_FROM: z
      .string()
      .email('EMAIL_FROM must be a valid email address')
      .optional(),
    SMTP_HOST: optionalStr,
    SMTP_PORT: z.coerce.number().int().positive().max(65535).optional(),
    SMTP_USER: optionalStr,
    SMTP_PASSWORD: optionalStr,
    SMTP_SECURE: z
      .string()
      .optional()
      .transform((v) => v === 'true'),

    // --- File storage (S3-compatible — MinIO by default) -------------------
    // Required: the docker-compose `minio` service ships working defaults in
    // .env.example, so `cp .env.example .env` works with zero extra setup —
    // same posture as DATABASE_URL.
    S3_ENDPOINT: z.string().url('S3_ENDPOINT must be a valid URL'),
    S3_ACCESS_KEY_ID: z.string().min(1, 'S3_ACCESS_KEY_ID is required'),
    S3_SECRET_ACCESS_KEY: z.string().min(1, 'S3_SECRET_ACCESS_KEY is required'),
    S3_BUCKET: z.string().min(1, 'S3_BUCKET is required'),
    S3_REGION: z.string().min(1).optional().default('us-east-1'),
    UPLOAD_MAX_SIZE_MB: z.coerce
      .number()
      .int()
      .positive()
      .optional()
      .default(10),
    MAX_STORAGE_PER_USER_MB: z.coerce
      .number()
      .int()
      .positive()
      .optional()
      .default(500),
    // Comma-separated MIME allow-list.
    UPLOAD_ALLOWED_MIME_TYPES: z
      .string()
      .min(1)
      .optional()
      .default('image/png,image/jpeg,image/webp,image/gif,application/pdf'),
  })
  .superRefine((val, ctx) => {
    // If email is toggled on, a provider MUST be configured — fail fast at boot
    // rather than silently dropping mail (or throwing on first send).
    if (!val.EMAIL_ENABLED) return
    const requiredWhenEnabled: Array<[string, unknown]> = [
      ['EMAIL_FROM', val.EMAIL_FROM],
      ['SMTP_HOST', val.SMTP_HOST],
      ['SMTP_PORT', val.SMTP_PORT],
    ]
    for (const [key, value] of requiredWhenEnabled) {
      if (value === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when EMAIL_ENABLED=true`,
        })
      }
    }
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
