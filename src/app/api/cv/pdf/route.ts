import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { CvSelectionSchema } from '@/lib/cv/schema'
// getAggregate (Prisma) & PDFDocument (pdf-lib) are intentionally lazy-loaded to avoid
// pulling heavy / native deps (and Prisma generated client) for early-return paths
// such as the unsupported (no Chromium) scenario. This also fixes a test that
// failed due to an environment-specific Prisma generated package.json resolution issue.
import { existsSync } from 'fs'
import type { Page } from 'puppeteer-core'
import { withRequestContext, logEvent, logError } from '@/lib/logger'
import { pdfRequestsTotal, pdfCacheGetDurationSeconds, pdfGenerationDurationSeconds } from '@/lib/metrics'
import { pdfCache, PdfCache } from '@/lib/pdf-cache'
import { startSpan } from '@/lib/tracing'
import { PDF_DEFAULT_TIMEOUT_MS, PDF_NAVIGATION_GRACE_MS, PDF_POST_RENDER_DELAY_MS, CHROMIUM_CANDIDATE_PATHS, CV_PAGE_SIZE } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Lazy dynamic import so it is only pulled in when this route runs (node runtime enforced)
async function getPuppeteer() {
  return (await import('puppeteer-core'))
}

// (pdf-lib lazy via dynamic import later)

const DEFAULT_TIMEOUT_MS = PDF_DEFAULT_TIMEOUT_MS

function buildBaseUrl(req: NextRequest): string {
  const envBase = process.env.BASE_URL?.replace(/\/$/, '')
  if (envBase) return envBase
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000'
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  return `${proto}://${host}`
}

function handlePdfError(e: Error & { message?: string }, ctx: { child: ReturnType<typeof withRequestContext>; genTimerEnd?: (l: Record<string,string>) => void; span: ReturnType<typeof startSpan> }) {
  const { child, genTimerEnd, span } = ctx
  if (e?.message === 'no_chromium') {
  logError(child, 'domain:cv.pdf.unsupported', e)
  // Cast removal: label already typed as string; no need for any
  pdfRequestsTotal.inc({ result: 'unsupported' })
    try { genTimerEnd?.({ result: 'error' }) } catch {}
    span.setAttribute('error', 'unsupported')
    span.end()
    return NextResponse.json({ error: 'Chromium binary not available', status: 501 }, { status: 501 })
  }
  if (e?.message?.includes('Navigation timeout')) {
    logError(child, 'domain:cv.pdf.timeout', e)
    pdfRequestsTotal.inc({ result: 'timeout' })
    try { genTimerEnd?.({ result: 'timeout' }) } catch {}
    span.setAttribute('error', 'timeout')
    span.end()
    return NextResponse.json({ error: 'Render timeout', status: 504 }, { status: 504 })
  }
  logError(child, 'domain:cv.pdf.error', e)
  pdfRequestsTotal.inc({ result: 'error' })
  try { genTimerEnd?.({ result: 'error' }) } catch {}
  span.setAttribute('error', e?.message || 'unknown')
  span.end()
  return NextResponse.json({ error: 'PDF generation failed', status: 500 }, { status: 500 })
}

export async function GET(req: NextRequest) {
  const child = withRequestContext(req)
  const started = Date.now()
  const url = new URL(req.url)
  const selection = parseSelection(url)

  const base = buildBaseUrl(req)
  const target = buildTargetUrl(base, selection)

  // Cache handling
  const cacheKey = PdfCache.hash(selection as Record<string, unknown>)
  const span = startSpan('pdf.generate', { cacheKey })
  // Timed cache get
  const cacheTimerEnd = (pdfCacheGetDurationSeconds as unknown as { startTimer?: (l: Record<string,string>) => (l2?: Record<string,string>) => void }).startTimer?.({ backend: pdfCache.kind })
  const cached = await pdfCache.get(cacheKey)
  try { cacheTimerEnd?.() } catch {}
  if (cached) {
    logEvent(child, 'domain:cv.pdf.cache_hit', { cacheKey })
    pdfRequestsTotal.inc({ result: 'success' })
    span.setAttribute('cache.hit', true)
    span.end()
    return new NextResponse(new Uint8Array(cached), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="cached-cv.pdf"',
        'Cache-Control': 'no-store',
        'X-Cache': 'HIT',
      },
    })
  }
  span.setAttribute('cache.hit', false)

  // Start overall generation timer
  const genTimerEnd = (pdfGenerationDurationSeconds as unknown as { startTimer?: (l: Record<string,string>) => (l2?: Record<string,string>) => void }).startTimer?.({ result: 'pending' })
  try {
    const { final, person } = await renderPdf(target)

    const duration = Date.now() - started
  logEvent(child, 'domain:cv.pdf.success', { ms: duration, selection: Object.keys(selection).length > 0 })
  pdfRequestsTotal.inc({ result: 'success' })
  try { genTimerEnd?.({ result: 'success' }) } catch {}
  await pdfCache.set(cacheKey, final)
    span.setAttribute('cache.stored', true)
    span.setAttribute('duration_ms', duration)
    span.end()
    return new NextResponse(final, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${person.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-cv.pdf"`,
        'Cache-Control': 'no-store',
        'X-Cache': 'MISS',
      },
    })
  } catch (err: unknown) {
    return handlePdfError(err as Error & { message?: string }, { child, genTimerEnd, span })
  } finally {
    // Removed unconditional finalize to avoid double labelling; individual error branches already set result.
  }
}

// --- Helpers (extracted to reduce cognitive complexity) ---
function parseSelection(url: URL) {
  const paramsRaw = {
    skills: url.searchParams.get('skills') || undefined,
    projects: url.searchParams.get('projects') || undefined,
    mode: url.searchParams.get('mode') || undefined,
  }
  const parsed = CvSelectionSchema.safeParse(paramsRaw)
  return parsed.success ? parsed.data : {}
}

function buildTargetUrl(base: string, selection: { skills?: string[]; projects?: string[] }) {
  const qp = new URLSearchParams()
  if (selection.skills?.length) qp.set('skills', selection.skills.join(','))
  if (selection.projects?.length) qp.set('projects', selection.projects.join(','))
  const qs = qp.toString()
  return base + '/cv/print' + (qs ? '?' + qs : '')
}

async function renderPdf(target: string) {
  const puppeteer = await getPuppeteer()
  const executablePath = process.env.CHROMIUM_PATH ?? CHROMIUM_CANDIDATE_PATHS.find((p) => { try { return existsSync(p) } catch { return false } })
  if (!executablePath) throw new Error('no_chromium')
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--font-render-hinting=none'] })
  const page = await browser.newPage()
  page.setDefaultTimeout(DEFAULT_TIMEOUT_MS)
  const navResult = await Promise.race([
    page.goto(target, { waitUntil: 'networkidle0' }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Navigation timeout')), DEFAULT_TIMEOUT_MS + PDF_NAVIGATION_GRACE_MS)),
  ])
  if (!navResult) throw new Error('Navigation failed')
  await new Promise((r) => setTimeout(r, PDF_POST_RENDER_DELAY_MS))
  const pageWithPdf = page as Page & { pdf?: unknown }
  if (typeof pageWithPdf.pdf !== 'function') throw new Error('pdf_fn_missing')
  const pdfUint8 = await page.pdf({
    format: CV_PAGE_SIZE,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
  })
  const { PDFDocument } = await import('pdf-lib')
  const { getAggregate } = await import('@/lib/cv/service')
  const pdfDoc = await PDFDocument.load(pdfUint8)
  const { data } = await getAggregate('en')
  const person = data.person
  pdfDoc.setTitle(`${person.name} – CV`)
  pdfDoc.setAuthor(person.name)
  pdfDoc.setSubject('Curriculum Vitae')
  pdfDoc.setKeywords(['CV','Resume', person.title, 'Short'].filter(Boolean))
  const final = Buffer.from(await pdfDoc.save())
  await browser.close()
  return { final, person }
}
