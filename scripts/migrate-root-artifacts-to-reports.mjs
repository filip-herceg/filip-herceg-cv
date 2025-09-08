#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const base = process.env.REPORTS_DIR || 'reports'

const plans = [
  { src: 'eslint-report.json', dest: 'lint/eslint-report.json' },
  { src: 'eslint-full.json', dest: 'lint/eslint-full.json' },
  { src: 'eslint-single.json', dest: 'lint/eslint-single.json' },
  { src: 'eslint-otel.json', dest: 'lint/eslint-otel.json' },
  { src: 'eslint_route.json', dest: 'lint/eslint-route.json' },
  { src: 'full_lint.json', dest: 'lint/full_lint.json' },
  { src: 'lint_full.json', dest: 'lint/lint_full.json' },
  { src: 'lint_service.json', dest: 'lint/lint_service.json' },
  { src: 'single_ambient_lint.json', dest: 'lint/single_ambient_lint.json' },
  { src: 'single_service_lint.json', dest: 'lint/single_service_lint.json' },
  { src: 'single_storage_lint.json', dest: 'lint/single_storage_lint.json' },
  { src: 'eslint-debug.log', dest: 'lint/eslint-debug.log' },
  { src: 'eslint-print-config.json', dest: 'lint/eslint-print-config.json' },
  { src: 'docs-index.json', dest: 'docs/docs-index.json' },
  { src: 'budget-report.json', dest: 'budgets/budget-report.json' },
  { src: 'flakey.json', dest: 'lint/flakey.json' },
  { src: 'full2.json', dest: 'lint/full2.json' }
]

for (const { src, dest } of plans) {
  const srcPath = join(ROOT, src)
  if (!existsSync(srcPath)) continue
  const destPath = join(ROOT, base, dest)
  mkdirSync(join(destPath, '..'), { recursive: true })
  try {
    writeFileSync(destPath, readFileSync(srcPath))
    process.stdout.write(`Copied ${src} -> ${join(base, dest)}\n`)
  } catch (e) {
    process.stderr.write(`Failed to copy ${src}: ${e}\n`)
  }
}
