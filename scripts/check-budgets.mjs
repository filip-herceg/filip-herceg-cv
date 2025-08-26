#!/usr/bin/env node
/**
 * Simple performance budget checks for JS bundle & images.
 * Intended to run after `next build`.
 */
import { createGzip } from 'node:zlib'
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'
import fs from 'node:fs'
import path from 'node:path'

const pipe = promisify(pipeline)

const ROOT = process.cwd()
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

async function analyzeJs() {
  // Use build-manifest to gather only client chunks for key pages
  const targetPages = ['/', '/cv', '/projects', '/contact']
  let manifest
  try {
    manifest = JSON.parse(fs.readFileSync(BUILD_MANIFEST, 'utf-8'))
  } catch {
    manifest = null
  }
  let fileSet = new Set()
  if (manifest && manifest.pages) {
    for (const p of targetPages) {
      const arr = manifest.pages[p]
      if (Array.isArray(arr)) {
        for (const rel of arr) if (rel.endsWith('.js')) fileSet.add(path.join(ROOT, '.next', rel))
      }
    }
    // Add shared runtime files
    if (Array.isArray(manifest.pages.__app)) for (const rel of manifest.pages.__app) if (rel.endsWith('.js')) fileSet.add(path.join(ROOT, '.next', rel))
  } else {
    // Fallback: scan static chunks dir
    if (fs.existsSync(NEXT_STATIC)) {
      for (const f of fs.readdirSync(NEXT_STATIC)) if (f.endsWith('.js')) fileSet.add(path.join(NEXT_STATIC, f))
    }
  }
  const files = [...fileSet]
  let total = 0
  let largest = 0
  const details = []
  for (const file of files) {
    const buf = fs.readFileSync(file)
    const gz = await gzipSizeSync(buf)
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
  if (summary.jsTotalGzip > BUDGETS.jsTotalGzip) failures.push(`JS total gzip ${summary.jsTotalGzip} > ${BUDGETS.jsTotalGzip}`)
  if (summary.jsLargestChunkGzip > BUDGETS.jsLargestChunkGzip) failures.push(`JS largest chunk gzip ${summary.jsLargestChunkGzip} > ${BUDGETS.jsLargestChunkGzip}`)
  if (summary.imageCount > BUDGETS.maxImages) failures.push(`Image count ${summary.imageCount} > ${BUDGETS.maxImages}`)
  if (summary.largestImage > BUDGETS.largestImage) failures.push(`Largest image ${summary.largestImage} > ${BUDGETS.largestImage}`)

  const reportPath = path.join(ROOT, 'budget-report.json')
  fs.writeFileSync(reportPath, JSON.stringify({ summary, jsDetails: js.details, images }, null, 2))

  if (failures.length) {
    console.error('Performance budget failures:\n' + failures.join('\n'))
    process.exitCode = 1
  } else {
    console.log('Performance budgets OK')
  }
})().catch(err => { console.error(err); process.exit(1) })
