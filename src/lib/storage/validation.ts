import { env } from '@/lib/env'

export interface UploadCandidate {
  sizeBytes: number
  mimeType: string
}

export interface ValidateUploadOptions {
  /** Overrides the env-driven `UPLOAD_MAX_SIZE_MB` ceiling (bytes). */
  maxSizeBytes?: number
  /** Overrides the env-driven `UPLOAD_ALLOWED_MIME_TYPES` allow-list. */
  allowedMimeTypes?: readonly string[]
}

export type ValidationResult = { ok: true } | { ok: false; error: string }

// Profile photos (spec 0018) are narrower than general uploads: images only,
// and a smaller fixed cap — narrow enough not to need its own env vars.
export const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024
export const AVATAR_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const

function defaultAllowedMimeTypes(): Set<string> {
  return new Set(
    env.UPLOAD_ALLOWED_MIME_TYPES.split(',').map((t) => t.trim().toLowerCase()),
  )
}

function defaultMaxUploadSizeBytes(): number {
  return env.UPLOAD_MAX_SIZE_MB * 1024 * 1024
}

function maxStoragePerUserBytes(): number {
  return env.MAX_STORAGE_PER_USER_MB * 1024 * 1024
}

/**
 * Validate a single upload against size, MIME-type, and per-user quota
 * limits. `currentUsageBytes` is the caller's existing stored total (sum of
 * `files.sizeBytes` for that owner) — the caller is responsible for computing
 * it (a DB round-trip), kept out of this function to keep it pure/testable.
 *
 * `options` lets a narrower caller (e.g. profile photo uploads) apply its own
 * size/type limits while still going through the same quota check as every
 * other upload — there is no separate, weaker validation path.
 */
export function validateUpload(
  candidate: UploadCandidate,
  currentUsageBytes: number,
  options: ValidateUploadOptions = {},
): ValidationResult {
  if (candidate.sizeBytes <= 0) {
    return { ok: false, error: 'File is empty.' }
  }

  const maxSize = options.maxSizeBytes ?? defaultMaxUploadSizeBytes()
  if (candidate.sizeBytes > maxSize) {
    const maxMb = Math.round(maxSize / (1024 * 1024))
    return { ok: false, error: `File exceeds the ${maxMb} MB upload limit.` }
  }

  const allowed = options.allowedMimeTypes
    ? new Set(options.allowedMimeTypes.map((t) => t.toLowerCase()))
    : defaultAllowedMimeTypes()
  if (!allowed.has(candidate.mimeType.toLowerCase())) {
    return {
      ok: false,
      error: `File type "${candidate.mimeType}" isn't allowed.`,
    }
  }

  const quota = maxStoragePerUserBytes()
  if (currentUsageBytes + candidate.sizeBytes > quota) {
    return {
      ok: false,
      error: `This would exceed your ${env.MAX_STORAGE_PER_USER_MB} MB storage quota.`,
    }
  }

  return { ok: true }
}

/** True for ASCII control characters (below 0x20) and DEL (0x7f). */
function isControlChar(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return code < 0x20 || code === 0x7f
}

/**
 * Strip path separators and control characters; cap length. Keeps the tail
 * (including the extension) if the name is absurdly long.
 */
export function sanitizeFilename(name: string): string {
  const withoutSeparators = name.replace(/[/\\]/g, '_')
  const cleaned = Array.from(withoutSeparators)
    .filter((ch) => !isControlChar(ch))
    .join('')
    .trim()
  const safe = cleaned.length > 0 ? cleaned : 'file'
  return safe.slice(-200)
}

/** Namespaced, collision-free, non-guessable object key for a given owner. */
export function buildBucketKey(ownerId: string, originalName: string): string {
  return `${ownerId}/${crypto.randomUUID()}-${sanitizeFilename(originalName)}`
}
