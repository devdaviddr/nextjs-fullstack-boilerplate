'use server'

import { eq, sql } from 'drizzle-orm'
import { headers } from 'next/headers'

import { db } from '@/db'
import { files } from '@/db/schema'
import { getCurrentSession } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { UPLOAD_LIMITS, rateLimit } from '@/lib/rate-limit'
import { clientIpFromHeaders } from '@/lib/request-ip'
import { deleteObject, putObject } from './client'
import { buildBucketKey, validateUpload } from './validation'

export interface FileSummary {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  createdAt: Date
}

// Next.js redacts a thrown Error's `message` in production builds ("An error
// occurred... omitted to avoid leaking sensitive details") — fine for truly
// unexpected failures, but it would swallow every validation message a user
// is meant to see (bad file type, quota exceeded, etc). So expected,
// user-facing outcomes are returned as plain data, never thrown — same
// pattern `src/lib/auth/actions.ts` already uses (`AuthFormState`) for
// login/register. Only genuinely unexpected errors (DB/S3 down) still throw,
// and SHOULD be redacted in production.
export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: string }

async function requireUserId(): Promise<string> {
  const session = await getCurrentSession()
  if (!session?.user.id) {
    throw new Error('You must be signed in.')
  }
  return session.user.id
}

/** Returns an error message if rate-limited, or null if the request may proceed. */
async function uploadRateLimitError(userId: string): Promise<string | null> {
  const h = await headers()
  const ip = clientIpFromHeaders(h)
  const limited = rateLimit(
    `upload:${userId}:${ip}`,
    UPLOAD_LIMITS.upload.limit,
    UPLOAD_LIMITS.upload.windowMs,
  )
  if (!limited.success) {
    logger.warn('Upload rate limit exceeded', { userId, ip })
    return 'Too many uploads. Please wait a moment.'
  }
  return null
}

async function currentUsageBytes(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${files.sizeBytes}), 0)` })
    .from(files)
    .where(eq(files.ownerId, userId))
  return Number(row?.total ?? 0)
}

/** Upload a file for the signed-in user. Expects a `file` entry in `formData`. */
export async function uploadFile(
  formData: FormData,
): Promise<ActionResult<FileSummary>> {
  const userId = await requireUserId()

  const rateLimitError = await uploadRateLimitError(userId)
  if (rateLimitError) return { ok: false, error: rateLimitError }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { ok: false, error: 'No file provided.' }
  }

  const mimeType = file.type || 'application/octet-stream'
  const usage = await currentUsageBytes(userId)
  const validation = validateUpload({ sizeBytes: file.size, mimeType }, usage)
  if (!validation.ok) {
    return { ok: false, error: validation.error }
  }

  const bucketKey = buildBucketKey(userId, file.name)
  const buffer = Buffer.from(await file.arrayBuffer())
  await putObject(bucketKey, buffer, mimeType)

  const [row] = await db
    .insert(files)
    .values({
      ownerId: userId,
      bucketKey,
      originalName: file.name,
      mimeType,
      sizeBytes: file.size,
    })
    .returning()

  if (!row) {
    // Genuinely unexpected (insert should never silently fail here) — let it
    // throw and get the generic production-safe message.
    throw new Error('Failed to record the uploaded file.')
  }

  logger.info('File uploaded', {
    userId,
    fileId: row.id,
    sizeBytes: row.sizeBytes,
  })

  return {
    ok: true,
    data: {
      id: row.id,
      originalName: row.originalName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      createdAt: row.createdAt,
    },
  }
}

/** List the signed-in user's own files, newest first. */
export async function listMyFiles(): Promise<FileSummary[]> {
  const userId = await requireUserId()
  const rows = await db.query.files.findMany({
    where: eq(files.ownerId, userId),
    orderBy: (files, { desc }) => [desc(files.createdAt)],
  })
  return rows.map((r) => ({
    id: r.id,
    originalName: r.originalName,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    createdAt: r.createdAt,
  }))
}

/** Delete a file. Ownership is enforced — a non-owner sees "not found", not "forbidden". */
export async function deleteFile(fileId: string): Promise<ActionResult<null>> {
  const userId = await requireUserId()

  const row = await db.query.files.findFirst({ where: eq(files.id, fileId) })
  if (!row || row.ownerId !== userId) {
    return { ok: false, error: 'File not found.' }
  }

  await deleteObject(row.bucketKey)
  await db.delete(files).where(eq(files.id, fileId))

  logger.info('File deleted', { userId, fileId })
  return { ok: true, data: null }
}

/**
 * Delete every S3 object owned by a user. Used by `admin-actions.ts`'s
 * `deleteUser` BEFORE the user row is deleted — the DB foreign key cascades
 * the `files` rows automatically, but never the underlying S3 objects, so
 * those must be removed explicitly while their bucket keys are still known.
 */
export async function deleteAllFilesForUser(userId: string): Promise<void> {
  const rows = await db.query.files.findMany({
    where: eq(files.ownerId, userId),
    columns: { bucketKey: true },
  })
  await Promise.all(rows.map((r) => deleteObject(r.bucketKey)))
}
