#!/usr/bin/env node
/* eslint-disable no-console */
// Minimal font subsetting pipeline: copies or subsets Inter WOFF2 used by Next's next/font into a stable location.
// For portability (no Python deps), we currently copy existing emitted WOFF2 from .next/static/media if available.
// In CI or local prebuild, run after `next build` to ensure artifacts exist.

import fs from 'fs'
import path from 'path'

const workspace = process.cwd()
const nextMediaDir = path.join(workspace, '.next', 'static', 'media')
const nextCssDir = path.join(workspace, '.next', 'static', 'css')
const outDir = path.join(workspace, 'public', 'fonts-subset')

function ensureDir(p) {
  try { fs.mkdirSync(p, { recursive: true }) } catch {}
}

function findFirstWoff2FromCss() {
  if (!fs.existsSync(nextCssDir)) return null
  const cssFiles = fs.readdirSync(nextCssDir).filter(f => f.endsWith('.css'))
  for (const f of cssFiles) {
    const css = fs.readFileSync(path.join(nextCssDir, f), 'utf8')
    // Look for /_next/static/media/<file>.woff2 in @font-face rules
    const m = css.match(/\/_next\/static\/media\/([A-Za-z0-9_-]+\.woff2)/)
    if (m && m[1]) return m[1]
  }
  return null
}

function main() {
  ensureDir(outDir)
  if (!fs.existsSync(nextMediaDir)) {
    console.warn('No .next/static/media directory; build first. Skipping copy.')
    process.exit(0)
  }
  // Prefer CSS-derived first WOFF2 (likely Inter subset) and copy to a stable name
  const cssWoff2 = findFirstWoff2FromCss()
  let picked = cssWoff2
  if (!picked) {
    // Fallback: pick any .woff2 from media
    const any = fs.readdirSync(nextMediaDir).filter(f => f.endsWith('.woff2'))
    if (any.length === 0) {
      console.warn('No WOFF2 fonts found to copy.')
      process.exit(0)
    }
    picked = any[0]
  }
  const src = path.join(nextMediaDir, picked)
  const dest = path.join(outDir, 'inter-subset.woff2')
  fs.copyFileSync(src, dest)
  console.log('Copied', picked, '->', path.relative(workspace, dest))
  console.log('Font copy done ->', outDir)
}

main()
