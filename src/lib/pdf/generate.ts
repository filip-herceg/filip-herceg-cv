import { CHROMIUM_CANDIDATE_PATHS, PDF_DEFAULT_TIMEOUT_MS, PDF_NAVIGATION_GRACE_MS, PDF_POST_RENDER_DELAY_MS, CV_PAGE_SIZE } from '@/lib/constants'
import { existsSync } from 'fs'
import type { Page } from 'puppeteer-core'
import { acquirePooledPage, warmChromiumPool } from '@/lib/pdf/chromium-pool'

async function getPuppeteer() { return (await import('puppeteer-core')) }

export interface PdfResult { final: Buffer; person: { name: string; title: string } }

export async function generateCvPdf(target: string): Promise<PdfResult> {
  // Try warm pool first
  await warmChromiumPool()
  const pooled = await acquirePooledPage()
  let page: Page
  let closeBrowser: null | (() => Promise<void>) = null
  if (pooled) {
    page = pooled.page
  } else {
  const puppeteer = await getPuppeteer()
    const candidates = [process.env.CHROMIUM_PATH, ...CHROMIUM_CANDIDATE_PATHS].filter((p): p is string => !!p && p.length > 0)
    const executablePath = candidates.find((p) => { try { return existsSync(p) } catch { return false } })
    if (!executablePath) throw new Error('no_chromium')
    const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--font-render-hinting=none'] })
    const tmpPage = await browser.newPage()
    tmpPage.setDefaultTimeout(PDF_DEFAULT_TIMEOUT_MS)
    page = tmpPage
    closeBrowser = async () => { try { await browser.close() } catch { /* ignore */ } }
  }
  const navResult = await Promise.race([
    page.goto(target, { waitUntil: 'networkidle0' }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Navigation timeout')), PDF_DEFAULT_TIMEOUT_MS + PDF_NAVIGATION_GRACE_MS)),
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
  if (pooled) {
    await pooled.release()
  } else if (closeBrowser) {
    await closeBrowser()
  }
  return { final, person }
}
