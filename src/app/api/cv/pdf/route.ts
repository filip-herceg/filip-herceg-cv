// Placeholder PDF route – will be implemented fully in step 8.
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  return NextResponse.json(
    { error: 'PDF generation not yet implemented', status: 501 },
    { status: 501 },
  )
}
