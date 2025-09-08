import { CHROMIUM_CANDIDATE_PATHS, PDF_DEFAULT_TIMEOUT_MS } from '@/lib/constants'
import { chromiumPoolEnabled, chromiumPoolPagesBusy, chromiumPoolPagesTotal, chromiumAcquireDurationSeconds } from '@/lib/metrics'
import { existsSync } from 'fs'
import type { Browser, Page } from 'puppeteer-core'

async function getPuppeteer() { return (await import('puppeteer-core')) }

type PoolState = {
  enabled: boolean
  executablePath?: string
  browser?: Browser
  available: Page[]
  busy: Set<Page>
  max: number
}

const state: PoolState = {
  enabled: false,
  available: [],
  busy: new Set<Page>(),
  max: Math.max(1, Number.parseInt(process.env.PDF_CHROMIUM_POOL_SIZE ?? '1', 10) || 1),
}

async function resolveChromiumPath(): Promise<string | undefined> {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  for (const p of CHROMIUM_CANDIDATE_PATHS) {
    try { if (existsSync(p)) return p } catch { /* ignore */ }
  }
  return undefined
}

async function ensureBrowser(): Promise<Browser | undefined> {
  if (state.browser) return state.browser
  const resolved = await resolveChromiumPath()
  if (!resolved) {
    state.enabled = false
    chromiumPoolEnabled.set(0)
    return undefined
  }
  const puppeteer = await getPuppeteer()
  state.executablePath = resolved
  state.browser = await puppeteer.launch({ executablePath: resolved, headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--font-render-hinting=none'] })
  state.enabled = true
  chromiumPoolEnabled.set(1)
  return state.browser
}

async function newPooledPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage()
  page.setDefaultTimeout(PDF_DEFAULT_TIMEOUT_MS)
  return page
}

export async function warmChromiumPool(): Promise<void> {
  const browser = await ensureBrowser()
  if (!browser) return
  while ((state.available.length + state.busy.size) < state.max) {
    const page = await newPooledPage(browser)
    state.available.push(page)
  }
  chromiumPoolPagesTotal.set(state.available.length + state.busy.size)
  chromiumPoolPagesBusy.set(state.busy.size)
}

export interface PooledPage {
  page: Page
  release: () => Promise<void>
}

export async function acquirePooledPage(): Promise<PooledPage | null> {
  const endTimer = chromiumAcquireDurationSeconds.startTimer?.()
  const browser = await ensureBrowser()
  if (!browser) {
    endTimer?.({})
    return null
  }
  let page: Page | undefined
  if (state.available.length > 0) {
    page = state.available.pop()
  } else if ((state.available.length + state.busy.size) < state.max) {
    page = await newPooledPage(browser)
  }
  if (!page) {
    // At capacity: create a one-off page that won't be returned to the pool
    const temp = await newPooledPage(browser)
    endTimer?.({})
    return {
      page: temp,
      release: async () => { try { await temp.close() } catch { /* ignore */ } },
    }
  }
  state.busy.add(page)
  chromiumPoolPagesBusy.set(state.busy.size)
  chromiumPoolPagesTotal.set(state.available.length + state.busy.size)
  endTimer?.({})
  return {
    page,
    release: async () => {
      if (state.busy.has(page)) {
        state.busy.delete(page)
        state.available.push(page)
        chromiumPoolPagesBusy.set(state.busy.size)
        chromiumPoolPagesTotal.set(state.available.length + state.busy.size)
      } else {
        // Not tracked (should not happen), close defensively
        try { await page.close() } catch { /* ignore */ }
      }
    },
  }
}

export async function shutdownChromiumPool(): Promise<void> {
  const b = state.browser
  state.enabled = false
  chromiumPoolEnabled.set(0)
  state.browser = undefined
  const toClose = [...state.available]
  state.available = []
  state.busy.clear()
  chromiumPoolPagesBusy.set(0)
  chromiumPoolPagesTotal.set(0)
  await Promise.allSettled(toClose.map((p) => p.close()))
  if (b) {
    try { await b.close() } catch { /* ignore */ }
  }
}
