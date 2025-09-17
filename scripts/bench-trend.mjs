#!/usr/bin/env node
/**
 * Simple benchmark trend reporter: reads reports/bench/pdf.json and prints a one-line summary.
 * Optionally appends to reports/bench/trend.csv for easy charting.
 */
import fs from 'node:fs'
import path from 'node:path'

const OUT_DIR = path.resolve('reports', 'bench')
const JSON_PATH = path.join(OUT_DIR, 'pdf.json')
const TREND_PATH = path.join(OUT_DIR, 'trend.csv')

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null }
}

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }) }

function main() {
  const data = readJsonSafe(JSON_PATH)
  if (!data) {
    console.error('No benchmark json at', JSON_PATH)
    process.exit(1)
  }
  const ts = data.ts || new Date().toISOString()
  const cold = Math.round(data.cold)
  const p50 = Math.round(data.p50)
  const p95 = Math.round(data.p95)
  const avg = Math.round(data.avg)
  console.log(`[bench] ${ts} cold=${cold}ms p50=${p50}ms p95=${p95}ms avg=${avg}ms iters=${data.iterations}`)

  ensureDir(OUT_DIR)
  const header = 'ts,cold_ms,warm_p50_ms,warm_p95_ms,warm_avg_ms,iters\n'
  const line = `${ts},${cold},${p50},${p95},${avg},${data.iterations}\n`
  if (!fs.existsSync(TREND_PATH)) {
    fs.writeFileSync(TREND_PATH, header + line)
  } else {
    fs.appendFileSync(TREND_PATH, line)
  }
}

main()
