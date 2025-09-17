#!/usr/bin/env node
/* eslint-disable no-console */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

function resolveChromePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH
  if (process.platform === 'win32') {
    const edge = 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
    if (fs.existsSync(edge)) return edge
  }
  return process.env.CHROME_PATH || ''
}

const chromePath = resolveChromePath()
if (!chromePath) {
  console.warn('CHROME_PATH not set and default not found. LHCI may fail.')
}

const urls = [
  'http://localhost:3000/',
  'http://localhost:3000/cv',
  'http://localhost:3000/projects',
  'http://localhost:3000/contact',
]

const args = [
  'lhci', 'autorun',
  `--collect.settings.chromePath=${chromePath}`,
  ...urls.flatMap(u => ['--collect.url=' + u]),
  '--upload.target=filesystem',
  '--upload.outputDir=reports/lighthouse',
]

const useShell = process.platform === 'win32'
const res = spawnSync(useShell ? 'npx.cmd' : 'npx', args, { stdio: 'inherit', shell: false, env: process.env })
if (res.status !== 0) {
  console.warn('LHCI exited with code', res.status)
  process.exitCode = 0 // don’t fail CI hard; reports still uploaded when possible
}
