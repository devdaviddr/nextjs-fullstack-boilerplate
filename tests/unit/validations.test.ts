import { describe, expect, it } from 'vitest'

import { loginSchema, registerSchema } from '@/lib/validations/auth'

describe('loginSchema', () => {
  it('accepts valid credentials and normalises email', () => {
    const result = loginSchema.parse({
      email: '  User@Example.COM ',
      password: 'anything',
    })
    expect(result.email).toBe('user@example.com')
  })

  it('rejects an invalid email', () => {
    expect(
      loginSchema.safeParse({ email: 'nope', password: 'x' }).success,
    ).toBe(false)
  })
})

describe('registerSchema', () => {
  const valid = {
    name: 'Ada',
    email: 'ada@example.com',
    password: 'Password123',
    confirmPassword: 'Password123',
  }

  it('accepts a strong, matching password', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects mismatched passwords on the confirmPassword field', () => {
    const result = registerSchema.safeParse({
      ...valid,
      confirmPassword: 'Password124',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes('confirmPassword')),
      ).toBe(true)
    }
  })

  it('rejects a password without an uppercase letter', () => {
    expect(
      registerSchema.safeParse({
        ...valid,
        password: 'password123',
        confirmPassword: 'password123',
      }).success,
    ).toBe(false)
  })

  it('rejects a password shorter than 8 characters', () => {
    expect(
      registerSchema.safeParse({
        ...valid,
        password: 'Pass1',
        confirmPassword: 'Pass1',
      }).success,
    ).toBe(false)
  })
})
