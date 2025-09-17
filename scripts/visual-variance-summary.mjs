#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const repo = process.cwd()
const reportPath = path.join(repo, 'reports', 'tests', 'visual-variance', 'variance.json')
let data = { generatedAt: null, items: [] }
if (fs.existsSync(reportPath)) {
  try { data = JSON.parse(fs.readFileSync(reportPath, 'utf8')) } catch {}
}

const lines = []
lines.push('# Visual Variance Report')
lines.push('')
lines.push(`Generated: ${data.generatedAt || 'n/a'}`)
lines.push('')
if (!data.items || data.items.length === 0) {
  lines.push('_No variance items found (scaffold)._')
} else {
  lines.push('| Spec | Snapshot | Mismatch % |')
  lines.push('|------|----------|------------:|')
  for (const it of data.items) {
    const pct = (it.ratio * 100).toFixed(2) + '%'
    lines.push(`| ${it.spec} | ${it.snapshot} | ${pct} |`)
  }
}

const md = lines.join('\n')
console.log(md)

if (process.env.GITHUB_STEP_SUMMARY) {
  try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '\n' + md + '\n') } catch {}
}
