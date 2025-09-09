#!/usr/bin/env node
// Orchestrates a prod-like Next.js start with PDF-friendly env, runs the PDF benchmark, then shuts down.

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import http from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'
import { dirname } from 'node:path'

const PORT = process.env.BENCH_PORT || '3100'
const HOST = process.env.BENCH_HOST || '127.0.0.1'
const BASE = process.env.BENCH_BASE || `http://${HOST}:${PORT}`
const ITERS = process.env.BENCH_ITERS || '8'
const OUT = process.env.BENCH_OUT || 'reports/bench/pdf.json'
const CHROME_WIN = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const CHROME_ENV = process.env.CHROMIUM_PATH || (existsSync(CHROME_WIN) ? CHROME_WIN : '')

async function waitForReady(url, timeoutMs = 30_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          // drain and resolve on any 2xx
          res.resume()
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve(true)
          else reject(new Error(String(res.statusCode)))
        })
        req.on('error', reject)
        req.setTimeout(2500, () => { try { req.destroy() } catch {} ; reject(new Error('timeout')) })
      })
      return true
    } catch {}
    await delay(500)
  }
  return false
}

function spawnServer() {
  const env = {
    ...process.env,
    PORT,
    HOST,
    CV_STORAGE: process.env.CV_STORAGE || 'memory',
    CV_AUTO_SEED: process.env.CV_AUTO_SEED || 'false',
  }
  if (CHROME_ENV) env.CHROMIUM_PATH = CHROME_ENV
  // Run Next directly for reliability on Windows (avoid npm shell)
  const nextBin = 'node_modules/next/dist/bin/next'
  const args = [nextBin, 'start', '-p', PORT, '-H', HOST]
  const child = spawn(process.execPath, args, { env, stdio: 'inherit' })
  return child
}

async function runBenchmark() {
  const env = { ...process.env, BENCH_BASE: BASE, BENCH_ITERS: ITERS, BENCH_OUT: OUT }
  try { mkdirSync(dirname(OUT), { recursive: true }) } catch {}
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/benchmark-pdf-pool.mjs', String(ITERS)], {
      env,
      stdio: 'inherit',
    })
    child.on('exit', (code) => (code === 0 ? resolve(undefined) : reject(new Error(`bench exit ${code}`))))
  })
}

;(async () => {
  // Ensure build exists first
  console.log('[bench-run] building Next.js app (production)...')
  await new Promise((resolve, reject) => {
    const nextBin = 'node_modules/next/dist/bin/next'
    const b = spawn(process.execPath, [nextBin, 'build'], { stdio: 'inherit', env: process.env })
    b.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`build exit ${code}`))))
  })

  console.log(`[bench-run] starting server at ${BASE} (PDF env) ...`)
  const srv = spawnServer()
  const healthUrl = `${BASE}/api/healthz`
  const ready = await waitForReady(healthUrl)
  if (!ready) {
    try { srv.kill('SIGTERM') } catch {}
    console.error('[bench-run] server did not become ready in time')
    process.exit(1)
    return
  }
  console.log('[bench-run] server is ready, running benchmark...')
  try {
    await runBenchmark()
    console.log(`[bench-run] benchmark complete, results at ${OUT}`)
  } catch (e) {
    console.error('[bench-run] benchmark failed:', e?.message || e)
    try { srv.kill('SIGTERM') } catch {}
    process.exit(1)
    return
  }
  console.log('[bench-run] shutting down server...')
  try { srv.kill('SIGTERM') } catch {}
})()
