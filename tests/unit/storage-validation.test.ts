import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {} as Record<string, unknown>,
}))

vi.mock('@/lib/env', () => ({ env: mockEnv }))

import {
  AVATAR_ALLOWED_MIME_TYPES,
  AVATAR_MAX_SIZE_BYTES,
  buildBucketKey,
  sanitizeFilename,
  validateUpload,
} from '@/lib/storage/validation'

const DEFAULTS = {
  UPLOAD_MAX_SIZE_MB: 10,
  MAX_STORAGE_PER_USER_MB: 500,
  UPLOAD_ALLOWED_MIME_TYPES: 'image/png,image/jpeg,application/pdf',
}

function setEnv(over: Record<string, unknown> = {}) {
  for (const key of Object.keys(mockEnv)) delete mockEnv[key]
  Object.assign(mockEnv, DEFAULTS, over)
}

beforeEach(() => setEnv())

describe('validateUpload', () => {
  it('rejects an empty file', () => {
    const result = validateUpload({ sizeBytes: 0, mimeType: 'image/png' }, 0)
    expect(result.ok).toBe(false)
  })

  it('rejects a file over the size limit', () => {
    const result = validateUpload(
      { sizeBytes: 11 * 1024 * 1024, mimeType: 'image/png' },
      0,
    )
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining('10 MB'),
    })
  })

  it('accepts a file at exactly the size limit', () => {
    const result = validateUpload(
      { sizeBytes: 10 * 1024 * 1024, mimeType: 'image/png' },
      0,
    )
    expect(result.ok).toBe(true)
  })

  it('rejects a disallowed MIME type', () => {
    const result = validateUpload(
      { sizeBytes: 1024, mimeType: 'application/x-msdownload' },
      0,
    )
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining('application/x-msdownload'),
    })
  })

  it('is case-insensitive on MIME type', () => {
    const result = validateUpload({ sizeBytes: 1024, mimeType: 'IMAGE/PNG' }, 0)
    expect(result.ok).toBe(true)
  })

  it('rejects when the upload would exceed the per-user quota', () => {
    setEnv({ MAX_STORAGE_PER_USER_MB: 1 }) // 1 MB quota
    const oneMb = 1024 * 1024
    const result = validateUpload(
      { sizeBytes: 1024, mimeType: 'image/png' },
      oneMb, // already at quota
    )
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining('1 MB storage quota'),
    })
  })

  it('accepts when comfortably within size, type, and quota limits', () => {
    const result = validateUpload(
      { sizeBytes: 2048, mimeType: 'application/pdf' },
      0,
    )
    expect(result).toEqual({ ok: true })
  })

  it('applies caller-supplied size/type overrides instead of the env defaults (avatar limits)', () => {
    // A PDF is well within the env's 10 MB default, but avatars use their
    // own smaller cap — the override, not the env value, must win.
    const result = validateUpload(
      { sizeBytes: AVATAR_MAX_SIZE_BYTES + 1, mimeType: 'application/pdf' },
      0,
      {
        maxSizeBytes: AVATAR_MAX_SIZE_BYTES,
        allowedMimeTypes: AVATAR_ALLOWED_MIME_TYPES,
      },
    )
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining('5 MB'),
    })
  })

  it('accepts a type allowed only by the override, not the env default', () => {
    const result = validateUpload(
      { sizeBytes: 1024, mimeType: 'image/webp' }, // not in the env default list
      0,
      { maxSizeBytes: 5 * 1024 * 1024, allowedMimeTypes: ['image/webp'] },
    )
    expect(result).toEqual({ ok: true })
  })

  it('still enforces the shared per-user quota when overrides are used', () => {
    setEnv({ MAX_STORAGE_PER_USER_MB: 1 })
    const oneMb = 1024 * 1024
    const result = validateUpload(
      { sizeBytes: 1024, mimeType: 'image/png' },
      oneMb,
      {
        maxSizeBytes: AVATAR_MAX_SIZE_BYTES,
        allowedMimeTypes: AVATAR_ALLOWED_MIME_TYPES,
      },
    )
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining('1 MB storage quota'),
    })
  })
})

describe('sanitizeFilename', () => {
  it('replaces path separators', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('.._.._etc_passwd')
  })

  it('strips control characters', () => {
    const nul = String.fromCharCode(0)
    const withControlChar = 'evil' + nul + 'name.txt'
    expect(sanitizeFilename(withControlChar)).toBe('evilname.txt')
  })

  it('falls back to "file" when the name is empty after cleaning', () => {
    expect(sanitizeFilename('   ')).toBe('file')
  })

  it('caps length, keeping the tail (extension)', () => {
    const long = 'a'.repeat(300) + '.png'
    const result = sanitizeFilename(long)
    expect(result.length).toBe(200)
    expect(result.endsWith('.png')).toBe(true)
  })
})

describe('buildBucketKey', () => {
  it('namespaces the key under the owner id', () => {
    const key = buildBucketKey('user-123', 'photo.png')
    expect(key.startsWith('user-123/')).toBe(true)
    expect(key.endsWith('photo.png')).toBe(true)
  })

  it('produces a different key on every call (collision-free)', () => {
    const a = buildBucketKey('user-123', 'photo.png')
    const b = buildBucketKey('user-123', 'photo.png')
    expect(a).not.toBe(b)
  })
})
