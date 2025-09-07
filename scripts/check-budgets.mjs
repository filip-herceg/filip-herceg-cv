#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Simple performance budget checks for JS bundle & images.
 * Intended to run after `next build`.
 */
import { createGzip } from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'


const ROOT = process.cwd()
const REPORTS_DIR = process.env.REPORTS_DIR || 'reports'
const NEXT_STATIC = path.join(ROOT, '.next', 'static', 'chunks')
const BUILD_MANIFEST = path.join(ROOT, '.next', 'build-manifest.json')
const PUBLIC_DIR = path.join(ROOT, 'public')

const BUDGETS = {
  jsTotalGzip: 180 * 1024, // 180KB
  jsLargestChunkGzip: 90 * 1024, // 90KB
  largestImage: 120 * 1024, // 120KB
  maxImages: 6
}

function gzipSizeSync(buffer) {
  // synchronous gzip size helper using zlib
  const zlib = createGzip()
  return new Promise((resolve, reject) => {
    let size = 0
    zlib.on('data', (c) => { size += c.length })
    zlib.on('end', () => resolve(size))
    zlib.on('error', reject)
    zlib.end(buffer)
  })
}

const TARGET_PAGES = ['/', '/cv', '/projects', '/contact']

function loadManifest() {
  try { return JSON.parse(fs.readFileSync(BUILD_MANIFEST, 'utf-8')) } catch { return null }
}

function collectJsFiles(manifest) {
  const fileSet = new Set()
  if (manifest?.pages) {
    for (const p of TARGET_PAGES) {
      const arr = manifest.pages[p]
      if (Array.isArray(arr)) arr.filter(rel => rel.endsWith('.js')).forEach(rel => fileSet.add(path.join(ROOT, '.next', rel)))
    }
    if (Array.isArray(manifest.pages.__app)) manifest.pages.__app.filter(rel => rel.endsWith('.js')).forEach(rel => fileSet.add(path.join(ROOT, '.next', rel)))
    return [...fileSet]
  }
  if (fs.existsSync(NEXT_STATIC)) {
    fs.readdirSync(NEXT_STATIC).filter(f => f.endsWith('.js')).forEach(f => fileSet.add(path.join(NEXT_STATIC, f)))
  }
  return [...fileSet]
}

async function analyzeJs() {
  const manifest = loadManifest()
  const files = collectJsFiles(manifest)
  let total = 0, largest = 0
  const details = []
  for (const file of files) {
    const gz = await gzipSizeSync(fs.readFileSync(file))
    total += gz
    if (gz > largest) largest = gz
    details.push({ file: path.relative(ROOT, file), gzip: gz })
  }
  return { total, largest, count: files.length, details }
}

function analyzeImages() {
  if (!fs.existsSync(PUBLIC_DIR)) return { images: [] }
  const images = []
  for (const f of fs.readdirSync(PUBLIC_DIR)) {
    const full = path.join(PUBLIC_DIR, f)
    const stat = fs.statSync(full)
    if (stat.isFile()) {
      const ext = path.extname(f).toLowerCase()
      if (['.png', '.jpg', '.jpeg', '.webp', '.avif'].includes(ext)) {
        images.push({ file: f, size: stat.size })
      }
    }
  }
  return { images }
}

;(async () => {
  const js = await analyzeJs()
  const { images } = analyzeImages()
  const largestImage = images.reduce((m, i) => Math.max(m, i.size), 0)
  const summary = {
    jsTotalGzip: js.total,
    jsLargestChunkGzip: js.largest,
    jsFiles: js.count,
    imageCount: images.length,
    largestImage,
    budgets: BUDGETS
  }

  const failures = []
  const checks = [
    summary.jsTotalGzip > BUDGETS.jsTotalGzip && `JS total gzip ${summary.jsTotalGzip} > ${BUDGETS.jsTotalGzip}`,
    summary.jsLargestChunkGzip > BUDGETS.jsLargestChunkGzip && `JS largest chunk gzip ${summary.jsLargestChunkGzip} > ${BUDGETS.jsLargestChunkGzip}`,
    summary.imageCount > BUDGETS.maxImages && `Image count ${summary.imageCount} > ${BUDGETS.maxImages}`,
    summary.largestImage > BUDGETS.largestImage && `Largest image ${summary.largestImage} > ${BUDGETS.largestImage}`,
  ].filter(Boolean)
  failures.push(...checks)

  // Primary: write into reports/budgets
  const budgetsDir = path.join(ROOT, REPORTS_DIR, 'budgets')
  fs.mkdirSync(budgetsDir, { recursive: true })
  const reportObj = { summary, jsDetails: js.details, images }
  const reportPath = path.join(budgetsDir, 'budget-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(reportObj, null, 2))

  // Transitional compatibility: also write legacy root file if it previously existed or for consumers expecting it
  try {
    const legacyPath = path.join(ROOT, 'budget-report.json')
    fs.writeFileSync(legacyPath, JSON.stringify(reportObj, null, 2))
  } catch {}

  if (failures.length) {
  process.stderr.write('Performance budget failures:\n' + failures.join('\n') + '\n')
    process.exitCode = 1
  } else {
  process.stdout.write('Performance budgets OK\n')
  }
})().catch(err => { process.stderr.write(String(err) + '\n'); process.exit(1) })
