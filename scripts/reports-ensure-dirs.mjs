#!/usr/bin/env node
import { mkdirSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const base = process.env.REPORTS_DIR || 'reports'
const dirs = ['lint', 'tests', 'a11y', 'lighthouse', 'docs', 'budgets']
for (const d of dirs) mkdirSync(join(ROOT, base, d), { recursive: true })
process.stdout.write('Ensured reports subdirectories: ' + dirs.join(', ') + '\n')
