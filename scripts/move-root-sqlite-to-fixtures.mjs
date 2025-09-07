#!/usr/bin/env node
import { readdirSync, mkdirSync, renameSync, statSync } from 'fs'
import path from 'node:path'

const ROOT = process.cwd()
const FIX_DIR = path.join(ROOT, 'src', 'tests', 'fixtures', 'db', 'legacy')
mkdirSync(FIX_DIR, { recursive: true })

const entries = readdirSync(ROOT, { withFileTypes: true })
const candidates = entries
  .filter(e => e.isFile())
  .map(e => e.name)
  .filter(n => /\.sqlite$/i.test(n))

if (!candidates.length) {
  console.log('No root .sqlite files found; nothing to move.')
  process.exit(0)
}

for (const f of candidates) {
  const from = path.join(ROOT, f)
  const to = path.join(FIX_DIR, f)
  try {
    // Skip if source is 0 bytes (defensive)
    if (statSync(from).size === 0) continue
    renameSync(from, to)
    console.log(`Moved ${f} -> ${path.relative(ROOT, to)}`)
  } catch (err) {
    console.error(`Failed to move ${f}:`, err?.message || err)
    process.exitCode = 1
  }
}
