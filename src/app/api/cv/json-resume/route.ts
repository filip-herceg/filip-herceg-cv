import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { projectExport, toJsonResume } from '@/lib/cv/export'
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
    const jr = toJsonResume(data)
    const body = JSON.stringify(jr)
    const headers: Record<string,string> = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
      ETag: etag,
    }
    if (req.headers.get('if-none-match') === etag) {
      logEvent(child, 'domain:cv.json_resume.not_modified', { etag, publicMode, token: !!cvToken })
      return new NextResponse(null, { status: 304, headers })
    }
    logEvent(child, 'domain:cv.json_resume.success', { etag, publicMode, token: !!cvToken })
    return new NextResponse(body, { status: 200, headers })
  } catch (e) {
    logError(child, 'domain:cv.json_resume.error', e as Error)
    return new NextResponse('internal error', { status: 500 })
  }
}
