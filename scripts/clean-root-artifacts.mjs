#!/usr/bin/env node
import { existsSync, unlinkSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const del = process.argv.includes('--delete')
const files = [
  'eslint-report.json','eslint-full.json','eslint-single.json','eslint-otel.json','eslint_route.json',
  'full_lint.json','lint_full.json','lint_service.json','single_ambient_lint.json','single_service_lint.json','single_storage_lint.json',
  'eslint-debug.log','eslint-print-config.json','docs-index.json','flakey.json','full2.json','budget-report.json'
]

for (const f of files) {
  const p = join(ROOT, f)
  if (!existsSync(p)) continue
  if (del) {
    try { unlinkSync(p); process.stdout.write(`Deleted ${f}\n`) } catch (e) { process.stderr.write(`Failed to delete ${f}: ${e}\n`) }
  } else {
    process.stdout.write(`[dry-run] Would delete ${f}\n`)
  }
}
