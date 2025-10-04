#!/usr/bin/env node
/**
 * Helper entrypoint for Playwright's webServer configuration.
 * Ensures the production server runs with the E2E flag so the CSP loosens
 * to allow inline scripts required for hydration.
 */

import { spawn } from 'node:child_process'
import process from 'node:process'

const isWin = process.platform === 'win32'
const npmCommand = isWin ? 'cmd.exe' : 'npm'

const buildArgs = isWin ? ['/c', 'npm', 'run', 'build'] : ['run', 'build']
const serveArgs = isWin ? ['/c', 'npm', 'run', 'serve'] : ['run', 'serve']

function run(command, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      ...opts,
    })
    child.on('exit', (code) => {
      if (code === 0) resolve(0)
      else reject(Object.assign(new Error(`${command} ${args.join(' ')} exited with ${code}`), { code }))
    })
    child.on('error', reject)
  })
}

function startAndWait(command, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      ...opts,
    })

    const shutdown = () => {
      if (!child.killed) {
        try { child.kill() } catch { /* ignore */ }
      }
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
    process.on('exit', shutdown)

    child.on('exit', (code) => {
      process.off('SIGINT', shutdown)
      process.off('SIGTERM', shutdown)
      process.off('exit', shutdown)
      if (code === 0) resolve(0)
      else reject(Object.assign(new Error(`${command} ${args.join(' ')} exited with ${code}`), { code }))
    })
    child.on('error', reject)
  })
}

async function main() {
  const env = { ...process.env, E2E: process.env.E2E ?? '1' }

  // Always rebuild so we match the production server bundle Playwright will hit.
  await run(npmCommand, buildArgs, { env })

  // Keep the process running by awaiting the serve command.
  await startAndWait(npmCommand, serveArgs, { env })
}

main().catch((err) => {
  console.error(err?.message || err)
  process.exit(typeof err?.code === 'number' ? err.code : 1)
})
