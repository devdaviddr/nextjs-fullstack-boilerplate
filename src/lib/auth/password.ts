import 'server-only'

import { hash, verify } from '@node-rs/argon2'

/**
 * Argon2id parameters — OWASP-recommended baseline (2024+). Argon2id is the
 * current best-practice password KDF. These values balance resistance against
 * GPU cracking with acceptable server-side latency (~50–100ms).
 */
const ARGON2_OPTIONS = {
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
} as const

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS)
}

export async function verifyPassword(
  storedHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, password, ARGON2_OPTIONS)
  } catch {
    // Malformed hash or verification error — treat as a failed login, never throw.
    return false
  }
}

let cachedDummyHash: Promise<string> | undefined

/**
 * Perform a verify against a throwaway hash and always return false. Call this
 * when no user matches an email so an attacker cannot distinguish
 * "no such account" from "wrong password" via response timing (user
 * enumeration). The dummy hash is computed once and cached.
 */
export async function fakeVerifyPassword(password: string): Promise<false> {
  cachedDummyHash ??= hashPassword('timing-attack-mitigation-placeholder')
  await verifyPassword(await cachedDummyHash, password)
  return false
}
