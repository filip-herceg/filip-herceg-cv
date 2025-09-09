#!/usr/bin/env node
// Simple benchmark for /api/cv/pdf to compare cold vs warm pool timings.
// Usage: node scripts/benchmark-pdf-pool.mjs [iterations]
// Assumes the app is running on http://localhost:3000 via `Start: next start` task.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const ITER = Number(process.argv[2] || process.env.BENCH_ITERS || 8)
const BASE = process.env.BENCH_BASE || 'http://localhost:3000'
const TARGET = `${BASE}/api/cv/pdf`
const OUT = process.env.BENCH_OUT

function pct(arr, p) {
  if (!arr.length) return NaN
  const i = Math.min(arr.length - 1, Math.max(0, Math.round((p / 100) * (arr.length - 1))))
  const sorted = [...arr].sort((a, b) => a - b)
  return sorted[i]
}

async function once(i) {
  const u = new URL(TARGET)
  // change query to avoid server-side cache hits (cache key based on selection params)
  u.searchParams.set('projects', String(i))
  const t0 = performance.now()
  const res = await fetch(u.toString(), { headers: { 'accept': 'application/pdf' } })
  const ok = res.ok
  const t1 = performance.now()
  if (!ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText} -> ${txt}`)
  }
  // drain body to avoid keep-alive backpressure
  await res.arrayBuffer()
  return t1 - t0
}

async function waitForReady(base, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const ping = await fetch(base, { cache: 'no-store' })
      if (ping.ok) return true
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

async function runBenchmark() {
  console.log(`[bench] hitting ${TARGET} for ${ITER} iterations`)
  const times = []
  for (let i = 0; i < ITER; i += 1) {
    const ms = await once(i)
    times.push(ms)
    const tag = i === 0 ? 'COLD' : 'warm'
    console.log(`[bench] #${i} ${tag}: ${ms.toFixed(0)} ms`)
  }
  return times
}

;(async () => {
  const ready = await waitForReady(BASE)
  if (!ready) {
    console.error(`[bench] service at ${BASE} did not become ready within 30s`)
    process.exit(1)
    return
  }

  try {
    const times = await runBenchmark()
    const warm = times.slice(1)
    const cold = times[0]
    const p50 = pct(warm, 50)
    const p95 = pct(warm, 95)
    const avg = warm.reduce((a, b) => a + b, 0) / Math.max(1, warm.length)
    console.log('\n=== PDF pool benchmark ===')
    console.log(`cold start: ${cold.toFixed(0)} ms`)
    console.log(`warm p50:   ${isNaN(p50) ? 'n/a' : p50.toFixed(0)} ms`)
    console.log(`warm p95:   ${isNaN(p95) ? 'n/a' : p95.toFixed(0)} ms`)
    console.log(`warm avg:   ${isNaN(avg) ? 'n/a' : avg.toFixed(0)} ms`)
    if (OUT) {
      const payload = { base: BASE, iterations: ITER, cold, warmTimes: warm, p50, p95, avg, ts: new Date().toISOString() }
      try { mkdirSync(dirname(OUT), { recursive: true }) } catch {}
      writeFileSync(OUT, JSON.stringify(payload, null, 2))
      console.log(`[bench] wrote results to ${OUT}`)
    }
  } catch (e) {
    console.error('[bench] fatal:', e?.stack || e?.message || e)
    process.exit(1)
  }
})()
