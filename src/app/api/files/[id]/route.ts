import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db'
import { files } from '@/db/schema'
import { getCurrentSession } from '@/lib/auth/session'
import { getObjectStream } from '@/lib/storage/client'

/**
 * Streams a stored file back to its owner. This is the ONLY path a browser
 * ever reaches MinIO through — MinIO itself has no public ingress (see
 * spec 0007) — so ownership is enforced here, not left to bucket ACLs.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession()
  if (!session?.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const row = await db.query.files.findFirst({ where: eq(files.id, id) })

  // Same response whether missing or owned by someone else — no existence signal.
  if (!row || row.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { body, contentType, contentLength } = await getObjectStream(
    row.bucketKey,
  )
  const safeName = row.originalName.replace(/["\r\n]/g, '')

  return new NextResponse(body, {
    headers: {
      'Content-Type': contentType ?? row.mimeType,
      ...(contentLength ? { 'Content-Length': String(contentLength) } : {}),
      'Content-Disposition': `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(row.originalName)}`,
      'Cache-Control': 'private, no-store',
    },
  })
}
