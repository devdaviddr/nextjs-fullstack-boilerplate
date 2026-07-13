import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db'
import { files } from '@/db/schema'
import { getCurrentSession } from '@/lib/auth/session'
import { getObjectStream } from '@/lib/storage/client'

/**
 * The quoted `filename="..."` parameter of a Content-Disposition header must
 * be Latin-1 — HTTP header values are ByteStrings, so any character above
 * 0xFF throws when the header is constructed. macOS screenshot names, for
 * example, contain a U+202F narrow no-break space (before "am"/"pm"), which
 * is exactly such a character. Strip anything outside printable ASCII, plus
 * the quote/backslash that would break the quoted-string. Modern browsers use
 * the RFC 5987 `filename*` (UTF-8, percent-encoded) below instead, which keeps
 * the real, full-Unicode name — this is only the legacy fallback.
 */
function asciiFilename(name: string): string {
  const cleaned = Array.from(name)
    .filter((ch) => {
      const code = ch.charCodeAt(0)
      return code >= 0x20 && code <= 0x7e && ch !== '"' && ch !== '\\'
    })
    .join('')
  return cleaned.length > 0 ? cleaned : 'download'
}

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
  const asciiName = asciiFilename(row.originalName)

  return new NextResponse(body, {
    headers: {
      'Content-Type': contentType ?? row.mimeType,
      ...(contentLength ? { 'Content-Length': String(contentLength) } : {}),
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(row.originalName)}`,
      'Cache-Control': 'private, no-store',
    },
  })
}
