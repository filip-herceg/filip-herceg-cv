import { NextResponse, type NextRequest } from 'next/server'
import { CvSelectionSchema } from '@/lib/cv/schema'
// getAggregate (Prisma) & PDFDocument (pdf-lib) are intentionally lazy-loaded to avoid
// pulling heavy / native deps (and Prisma generated client) for early-return paths
// such as the unsupported (no Chromium) scenario. This also fixes a test that
// failed due to an environment-specific Prisma generated package.json resolution issue.
import { existsSync } from 'fs'
import type { Page } from 'puppeteer-core'
import type { PDFDocument as PDFDocumentType, RGB } from 'pdf-lib'
import { warmChromiumPool, acquirePooledPage } from '@/lib/pdf/chromium-pool'
import { withRequestContext, logEvent, logError } from '@/lib/logger'
import { pdfRequestsTotal, pdfCacheGetDurationSeconds, pdfGenerationDurationSeconds, pdfRenderDomDurationSeconds, pdfLastPageCount } from '@/lib/metrics'
import { pdfCache, PdfCache } from '@/lib/pdf-cache'
import { startSpan } from '@/lib/tracing'
import { PDF_DEFAULT_TIMEOUT_MS, PDF_NAVIGATION_GRACE_MS, PDF_POST_RENDER_DELAY_MS, CHROMIUM_CANDIDATE_PATHS, CV_PAGE_SIZE } from '@/lib/constants'
import { freezeNow } from '@/lib/deterministic'

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
  if (e?.message?.startsWith('launch_failed')) {
    logError(child, 'domain:cv.pdf.launch_failed', e)
    pdfRequestsTotal.inc({ result: 'error' })
    try { genTimerEnd?.({ result: 'error' }) } catch {}
    span.setAttribute('error', 'launch_failed')
    span.end()
    return NextResponse.json({ error: 'Chromium launch failed', status: 500 }, { status: 500 })
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
  const shareToken = url.searchParams.get('st') || undefined

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
  const { final, person } = await renderPdf(target, { baseUrl: base, shareToken })

    const duration = Date.now() - started
  logEvent(child, 'domain:cv.pdf.success', { ms: duration, selection: Object.keys(selection).length > 0 })
  pdfRequestsTotal.inc({ result: 'success' })
  try { genTimerEnd?.({ result: 'success' }) } catch {}
  // Store as Buffer in cache for compatibility
  await pdfCache.set(cacheKey, Buffer.from(final))
    span.setAttribute('cache.stored', true)
    span.setAttribute('duration_ms', duration)
    span.end()
  // Respond with bytes as Uint8Array (Web BodyInit)
  const responseBytes = new Uint8Array(final)
  return new NextResponse(responseBytes, {
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

type RgbFn = (r: number, g: number, b: number) => RGB

// Acquire a Chromium page (pooled if available; otherwise launch a new browser)
async function acquirePage(): Promise<{ page: Page; cleanup: () => Promise<void> }> {
  await warmChromiumPool()
  const pooled = await acquirePooledPage()
  if (pooled) {
    return { page: pooled.page, cleanup: async () => { try { await pooled.release() } catch { /* ignore */ } } }
  }
  const puppeteer = await getPuppeteer()
  const executablePath = process.env.CHROMIUM_PATH ?? CHROMIUM_CANDIDATE_PATHS.find((p) => { try { return existsSync(p) } catch { return false } })
  if (!executablePath) throw new Error('no_chromium')
  // Best-effort: attempt launch and surface clearer error if it fails
  let browser: Awaited<ReturnType<(typeof puppeteer)['launch']>>
  try {
    browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--font-render-hinting=none'] })
  } catch (err: unknown) {
    const msg = (err as Error)?.message || 'unknown'
    throw new Error(`launch_failed: ${msg}`)
  }
  const page = await browser.newPage()
  page.setDefaultTimeout(DEFAULT_TIMEOUT_MS)
  return { page, cleanup: async () => { try { await browser.close() } catch { /* ignore */ } } }
}

// Inject browser-side Date/Intl freeze to reduce nondeterminism
async function injectDeterministicEnv(page: Page): Promise<void> {
  try {
    await page.evaluateOnNewDocument(`(() => {
      const fixed = new Date('2024-01-01T00:00:00.000Z');
      const RealDate = Date;
      function FakeDate(...args) {
        if (new.target) { return args.length ? new RealDate(...args) : new RealDate(fixed); }
        return RealDate(...args);
      }
      FakeDate.UTC = RealDate.UTC; FakeDate.parse = RealDate.parse; FakeDate.now = () => fixed.getTime(); FakeDate.prototype = RealDate.prototype;
      // @ts-ignore
      window.Date = FakeDate;
      const RealDTF = Intl.DateTimeFormat;
      const FakeDTF = function(locale, options) {
        const stableOpts = Object.assign({ timeZone: 'UTC' }, options || {});
        // @ts-ignore
        return new RealDTF(locale, stableOpts);
      };
      // @ts-ignore
      FakeDTF.supportedLocalesOf = RealDTF.supportedLocalesOf.bind(RealDTF);
      // @ts-ignore
      FakeDTF.prototype = RealDTF.prototype;
      // @ts-ignore
      Intl.DateTimeFormat = FakeDTF;
    })();`)
  } catch { /* ignore */ }
}

// Navigate to target and measure DOMContentLoaded time
async function navigateAndMeasureDomReady(page: Page, target: string): Promise<void> {
  const domTimerEnd = (pdfRenderDomDurationSeconds as unknown as { startTimer?: (l?: Record<string,string>) => (add?: Record<string,string>) => void }).startTimer?.()
  try {
    const navDom = await Promise.race([
      page.goto(target, { waitUntil: 'domcontentloaded' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Navigation timeout')), DEFAULT_TIMEOUT_MS + PDF_NAVIGATION_GRACE_MS)),
    ])
    if (!navDom) throw new Error('Navigation failed')
    // Keep prior behavior: wait for full load but don't fail hard
    try { await page.waitForFunction(() => document.readyState === 'complete', { timeout: DEFAULT_TIMEOUT_MS }).catch(() => {}) } catch {}
  } finally {
    // Always finalize the histogram so failures are observable
    try { domTimerEnd?.() } catch {}
  }
}

// Optionally draw a QR footer pointing to short link
async function maybeAddQrFooter(pdfDoc: PDFDocumentType, rgb: RgbFn, opts?: { baseUrl?: string; shareToken?: string }) {
  if (!opts?.shareToken || !opts.baseUrl) return
  try {
    const QRCode = (await import('qrcode')).default as unknown as { toBuffer: (text: string, cfg?: { errorCorrectionLevel?: 'L'|'M'|'Q'|'H'; margin?: number; width?: number; color?: { dark?: string; light?: string } }) => Promise<Buffer> }
    const shortUrl = `${opts.baseUrl.replace(/\/$/, '')}/s/${encodeURIComponent(opts.shareToken)}`
    const png = await QRCode.toBuffer(shortUrl, { errorCorrectionLevel: 'M', margin: 0, width: 84, color: { dark: '#000000', light: '#FFFFFF00' } })
    const pngEmbed = await pdfDoc.embedPng(png)
    const pages = pdfDoc.getPages()
    for (const p of pages) {
      const { width } = p.getSize()
      const qrSize = 28
      const pad = 12
      p.drawImage(pngEmbed, { x: width - qrSize - pad, y: pad, width: qrSize, height: qrSize })
      p.drawText('scan to view online', { x: width - qrSize - pad, y: pad + qrSize + 4, size: 8, color: rgb(0,0,0) })
    }
  } catch { /* ignore */ }
}

async function renderPdf(target: string, opts?: { baseUrl?: string; shareToken?: string }) {
  const { page, cleanup } = await acquirePage()
  await injectDeterministicEnv(page)
  // Freeze time and Intl for deterministic render window
  const restore = freezeNow()
  let person: { name: string; title?: string } = { name: 'cv' }
  try {
    await navigateAndMeasureDomReady(page, target)
    await new Promise((r) => setTimeout(r, PDF_POST_RENDER_DELAY_MS))
    const pageWithPdf = page as Page & { pdf?: unknown }
    if (typeof pageWithPdf.pdf !== 'function') throw new Error('pdf_fn_missing')
    const pdfUint8 = await page.pdf({
      format: CV_PAGE_SIZE,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    })
  const { PDFDocument, rgb } = await import('pdf-lib')
    const { getAggregate } = await import('@/lib/cv/service')
  const pdfDoc = await PDFDocument.load(pdfUint8)
    const { data } = await getAggregate('en')
    person = data.person
    pdfDoc.setTitle(`${person.name} – CV`)
    pdfDoc.setAuthor(person.name)
    pdfDoc.setSubject('Curriculum Vitae')
  pdfDoc.setKeywords(['CV','Resume', person.title, 'Short'].filter((v): v is string => typeof v === 'string' && v.length > 0))

  // Optional: draw a tiny QR code in the footer that points to a short link if a share token is provided
  await maybeAddQrFooter(pdfDoc, rgb, opts)
  // Update last page count gauge
  try { pdfLastPageCount.set(pdfDoc.getPageCount()) } catch {}
  const bytes = await pdfDoc.save()
  const final = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  return finalize(final, person)
  } finally {
    // Restore globals after render completes or on error
    try { restore() } catch { /* ignore */ }
    await cleanup()
  }

  function finalize(final: Uint8Array, person: { name: string; title?: string }) {
    return { final, person }
  }
}
