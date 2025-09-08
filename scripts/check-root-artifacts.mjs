#!/usr/bin/env node
import { readdirSync } from 'fs'

const ROOT = process.cwd()
const entries = readdirSync(ROOT, { withFileTypes: true })
const files = entries.filter(e => e.isFile()).map(e => e.name)

// Allow-listed root files (committed fixtures or transitional outputs)
const ALLOW = new Set([])

const offenders = []
for (const f of files) {
  // Block sqlite/db/log artifacts at root (incl. WAL/SHM)
  if (/\.(sqlite|sqlite-journal|db|db-wal|db-shm|log)$/i.test(f) && !ALLOW.has(f)) offenders.push(f)
  // Block ad-hoc lint/docs artifacts we consolidated under reports/
  if (/^eslint-.*\.json$/i.test(f)) offenders.push(f)
  if (f === 'eslint-print-config.json') offenders.push(f)
  if (/^(full2|flakey|full_lint|lint_full|lint_service|single_.*_lint)\.json$/i.test(f)) offenders.push(f)
  if (f === 'docs-index.json') offenders.push(f)
  if (f === 'budget-report.json') offenders.push(f)
}

if (offenders.length) {
  console.error('Unexpected root artifacts found (should live under reports/ or be ignored):')
  for (const f of offenders) console.error(' -', f)
  process.exit(1)
} else {
  console.log('Root hygiene OK')
}
