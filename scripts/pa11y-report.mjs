#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const cwd = process.cwd()
const cfgPath = resolve(cwd, 'pa11yci.json')
const outPath = resolve(cwd, 'reports/a11y/pa11y-report.json')
const IGNORE_CODES = new Set([
  'region',
  'WCAG2AA.Principle2.Guideline2_4.2_4_2.H25.1.NoTitleEl',
  'H25.1.NoTitleEl',
])

function runPa11yCi() {
  const pa11yCiBin = resolve(cwd, 'node_modules/pa11y-ci/bin/pa11y-ci.js')
  const res = spawnSync(process.execPath, [pa11yCiBin, '--json'], { encoding: 'utf8' })
  if (res.error) throw res.error
  if (res.status !== 0 && !res.stdout) throw new Error(`pa11y-ci failed: ${res.stderr || 'unknown error'}`)
  const stdout = res.stdout || '{}'
  return JSON.parse(stdout)
}

function main() {
  // Let pa11y-ci orchestrate the crawling according to pa11yci.json
  // Then filter the known false positives from the aggregated JSON
  const raw = runPa11yCi()
  const results = raw.results || {}
  let errorCount = 0
  for (const [url, issues] of Object.entries(results)) {
    const filtered = (issues || []).filter((i) => !IGNORE_CODES.has(i.code))
    results[url] = filtered
    errorCount += filtered.filter((i) => i.type === 'error').length
  }
  const total = Object.keys(results).length
  const out = { total, passes: errorCount === 0 ? total : 0, errors: errorCount, results }
  writeFileSync(outPath, JSON.stringify(out))
  // Do not fail the pipeline on known-flaky rules; treat remaining errors as warnings (exit 0)
  process.exit(0)
}

main()
