import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { projectExport, skillsToCsv } from '@/lib/cv/export'
import { withRequestContext, logEvent, logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const child = withRequestContext(req)
  const url = new URL(req.url)
  const publicMode = url.searchParams.get('public') === '1'
  const cvToken = url.searchParams.get('cv')
  const searchParams = url.searchParams
  try {
    const { data, etag } = await projectExport({ cvToken, searchParams, publicMode })
    const body = skillsToCsv(data.skills)
    const headers: Record<string,string> = {
      'Content-Type': 'text/csv; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
      'Content-Disposition': 'inline; filename="skills.csv"',
      ETag: etag,
    }
    if (req.headers.get('if-none-match') === etag) {
      logEvent(child, 'domain:cv.skills_csv.not_modified', { etag, publicMode, token: !!cvToken })
      return new NextResponse(null, { status: 304, headers })
    }
    logEvent(child, 'domain:cv.skills_csv.success', { etag, publicMode, token: !!cvToken, count: data.skills.length })
    return new NextResponse(body, { status: 200, headers })
  } catch (e) {
    logError(child, 'domain:cv.skills_csv.error', e as Error)
    return new NextResponse('internal error', { status: 500 })
  }
}
