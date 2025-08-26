import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { CvSelectionSchema } from '@/lib/cv/schema'
import { sampleCvData } from '@/lib/cv/sample-data'
import { existsSync } from 'fs'
import type { Browser } from 'puppeteer-core'
import { withRequestContext, logEvent, logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Lazy dynamic import so it is only pulled in when this route runs (node runtime enforced)
async function getPuppeteer() {
  return (await import('puppeteer-core'))
}

import { PDFDocument } from 'pdf-lib'

const DEFAULT_TIMEOUT_MS = 20000

function buildBaseUrl(req: NextRequest): string {
  const envBase = process.env.BASE_URL?.replace(/\/$/, '')
  if (envBase) return envBase
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000'
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  return `${proto}://${host}`
}

export async function GET(req: NextRequest) {
  const child = withRequestContext(req)
  const started = Date.now()
  const url = new URL(req.url)
  const paramsRaw = {
    skills: url.searchParams.get('skills') || undefined,
    projects: url.searchParams.get('projects') || undefined,
    mode: url.searchParams.get('mode') || undefined,
  }
  const parsed = CvSelectionSchema.safeParse(paramsRaw)
  const selection = parsed.success ? parsed.data : {}

  const base = buildBaseUrl(req)
  const qp = new URLSearchParams()
  if (selection.skills?.length) qp.set('skills', selection.skills.join(','))
  if (selection.projects?.length) qp.set('projects', selection.projects.join(','))
  // mode=short doesn't change print rendering; omit to keep canonical print URLs
  const target = `${base}/cv/print${qp.toString() ? `?${qp.toString()}` : ''}`

  let browser: Browser | null = null
  try {
    const puppeteer = await getPuppeteer()
    const executablePath = process.env.CHROMIUM_PATH ||
      ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', 'C:/Program Files/Google/Chrome/Application/chrome.exe']
        .find((p) => {
          try { return existsSync(p) } catch { return false }
        })

    if (!executablePath) {
      logEvent(child, 'domain:cv.pdf.unsupported', { reason: 'no_chromium' })
      return NextResponse.json({ error: 'PDF generation not supported (no Chromium binary)', status: 501 }, { status: 501 })
    }

  browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--font-render-hinting=none'] })
    const page = await browser.newPage()
    page.setDefaultTimeout(DEFAULT_TIMEOUT_MS)

    const navResult = await Promise.race([
      page.goto(target, { waitUntil: 'networkidle0' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Navigation timeout')), DEFAULT_TIMEOUT_MS + 2000)),
    ])
    if (!navResult) throw new Error('Navigation failed')

    // Add small delay ensuring fonts/render settled
  await new Promise((r) => setTimeout(r, 300))
  const pdfUint8 = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    })

    // Metadata injection
  const pdfDoc = await PDFDocument.load(pdfUint8)
    const person = sampleCvData.person
    pdfDoc.setTitle(`${person.name} – CV`)
    pdfDoc.setAuthor(person.name)
    pdfDoc.setSubject('Curriculum Vitae')
    pdfDoc.setKeywords(['CV','Resume', person.title, 'Short'].filter(Boolean) as string[])
  const final = Buffer.from(await pdfDoc.save())

    const duration = Date.now() - started
    logEvent(child, 'domain:cv.pdf.success', { ms: duration, selection: Object.keys(selection).length > 0 })
    return new NextResponse(final, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${person.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-cv.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: unknown) {
    const e = err as Error & { message?: string }
    if (e?.message?.includes('Navigation timeout')) {
      logError(child, 'domain:cv.pdf.timeout', e)
      return NextResponse.json({ error: 'Render timeout', status: 504 }, { status: 504 })
    }
    logError(child, 'domain:cv.pdf.error', e)
    return NextResponse.json({ error: 'PDF generation failed', status: 500 }, { status: 500 })
  } finally {
    try { await browser?.close() } catch {}
  }
}
