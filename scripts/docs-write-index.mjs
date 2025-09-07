#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const REPORTS_DIR = process.env.REPORTS_DIR || 'reports'
const docsDir = join(ROOT, 'docs')
const outDir = join(ROOT, REPORTS_DIR, 'docs')
const outPath = join(outDir, 'docs-index.json')

const index = []

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('_')) continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full)
    else if (name.endsWith('.md')) collect(full)
  }
}

function collect(p) {
  const rel = p.replace(ROOT + '\\', '').replace(/\\/g, '/')
  const raw = readFileSync(p, 'utf8')
  const fm = /^---[\s\S]*?---/m.exec(raw)?.[0] || ''
  const meta = {}
  if (fm) {
    for (const line of fm.split(/\r?\n/)) {
      const m = /^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.+)$/.exec(line.trim())
      if (m) meta[m[1]] = m[2]
    }
  }
  index.push({ file: rel, title: meta.title || null, category: meta.category || null, status: meta.status || null, canonical: meta.canonical || null })
}

walk(docsDir)
index.sort((a,b)=>a.file.localeCompare(b.file))

mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, JSON.stringify(index, null, 2))

// Also print to stdout for compatibility with piping
process.stdout.write(JSON.stringify(index, null, 2))
