#!/usr/bin/env node
import fss from 'node:fs'
import path from 'node:path'

const repo = process.cwd()
const testsDir = path.join(repo, 'src', 'tests', 'e2e')

const configured = [
  { spec: 'print-fidelity.spec.ts', baseline: 'cv-print-a4.png' },
  { spec: 'print-fidelity.spec.ts', baseline: 'cv-print-letter-compact.png' },
]

async function main() {
  const missing = []
  for (const c of configured) {
    const spec = path.join(testsDir, c.spec)
    const snapDir = `${spec}-snapshots`
    const target = path.join(snapDir, c.baseline)
    if (!fss.existsSync(target)) missing.push(target)
  }
  if (missing.length) {
    console.error('Missing visual baselines:')
    for (const m of missing) console.error('  -', m)
    console.error('\nTo create/update locally: set EXPORT_PRINT_DIFF=1 and run the E2E tests.')
    process.exit(1)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
