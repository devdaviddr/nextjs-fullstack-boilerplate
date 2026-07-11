import { z } from 'zod'

/**
 * Shared auth input schemas. Used by client forms (react-hook-form), server
 * actions, and the credentials provider so validation rules live in one place.
 */

const email = z
  .string()
  .min(1, 'Email is required')
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address').max(255))

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  // Argon2 has no bcrypt-style 72-byte limit; this cap only bounds hashing cost
  // (a DoS guard against absurdly long inputs).
  .max(128, 'Password must be at most 128 characters')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(255),
    email,
    password: password
      .regex(/[a-z]/, 'Include at least one lowercase letter')
      .regex(/[A-Z]/, 'Include at least one uppercase letter')
      .regex(/[0-9]/, 'Include at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
