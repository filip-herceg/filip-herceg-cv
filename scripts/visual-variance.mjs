#!/usr/bin/env node
/*
Generates a simple variance report by comparing the latest actual images
from Playwright against stored baselines.
Outputs JSON + HTML under reports/tests/visual-variance/.
*/
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(__dirname, '..')
const testsDir = path.join(repo, 'src', 'tests', 'e2e')
const outDir = path.join(repo, 'reports', 'tests', 'visual-variance')

async function ensureDir(p) { await fs.mkdir(p, { recursive: true }) }

function snapshotDirFor(testFile) {
  return `${testFile}-snapshots`
}

async function loadPng(file) {
  const buf = await fs.readFile(file)
  return PNG.sync.read(buf)
}

function percent(n, d) { return d === 0 ? 0 : (n / d) }

async function comparePair(baselinePath, actualPath, diffOutPath) {
  const baseline = await loadPng(baselinePath)
  const actual = await loadPng(actualPath)
  const w = Math.min(baseline.width, actual.width)
  const h = Math.min(baseline.height, actual.height)
  const diff = new PNG({ width: w, height: h })
  const mismatch = pixelmatch(baseline.data, actual.data, diff.data, w, h, { threshold: 0.1 })
  const ratio = percent(mismatch, w * h)
  await fs.writeFile(diffOutPath, PNG.sync.write(diff))
  return { mismatch, ratio, width: w, height: h }
}

async function main() {
  await ensureDir(outDir)
  const specs = await fs.readdir(testsDir)
  const results = []
  for (const f of specs) {
    if (!f.endsWith('.spec.ts')) continue
    const testBase = path.join(testsDir, f)
    const snapsDir = snapshotDirFor(testBase)
    try {
      const entries = await fs.readdir(snapsDir)
      for (const s of entries) {
        if (!s.endsWith('.png')) continue
        // Playwright stores actual images beside results; for variance we assume a convention:
        // actuals at test-run output dir: test-results/**/screenshot-*.png (not perfectly addressable here)
        // Instead, support dual baselines by filename suffixes and compare between them.
        // Example: cv-print-a4.png vs cv-print-letter-compact.png (treated as separate baselines).
        // We'll skip intra-baseline compare unless a sibling baseline exists.
      }
    } catch {}
  }
  // For now, we don’t have deterministic access to actual images; we emit an empty scaffold.
  const jsonPath = path.join(outDir, 'variance.json')
  const htmlPath = path.join(outDir, 'index.html')
  const data = { generatedAt: new Date().toISOString(), items: results }
  await fs.writeFile(jsonPath, JSON.stringify(data, null, 2))
  await fs.writeFile(htmlPath, `<!doctype html><meta charset="utf-8"><title>Visual Variance</title><h1>Visual Variance Report</h1><pre>${JSON.stringify(data, null, 2)}</pre>`)
}

main().catch(err => { console.error(err); process.exit(1) })
