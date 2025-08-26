import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { projectExport, skillsToCsv } from '@/lib/cv/export'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const publicMode = url.searchParams.get('public') === '1'
  const cvToken = url.searchParams.get('cv')
  const searchParams = url.searchParams

  const { data, etag } = await projectExport({ cvToken, searchParams, publicMode })
  const body = skillsToCsv(data.skills)

  const headers: Record<string,string> = {
    'Content-Type': 'text/csv; charset=utf-8',
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
    'Content-Disposition': 'inline; filename="skills.csv"',
    ETag: etag,
  }
  if (req.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers })
  }
  return new NextResponse(body, { status: 200, headers })
}
