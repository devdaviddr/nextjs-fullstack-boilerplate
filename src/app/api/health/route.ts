import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db'

// Liveness/readiness probe for load balancers, Docker healthchecks, and uptime
// monitors. Verifies the process is up and the database is reachable.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`)
    return NextResponse.json(
      { status: 'ok', db: 'up', timestamp: new Date().toISOString() },
      { status: 200 },
    )
  } catch {
    return NextResponse.json(
      { status: 'error', db: 'down', timestamp: new Date().toISOString() },
      { status: 503 },
    )
  }
}
