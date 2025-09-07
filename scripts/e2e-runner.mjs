#!/usr/bin/env node
/*
  E2E Orchestrator
  - Picks a free port
  - Builds the app
  - Starts Next.js (production) on that port
  - Waits until ready
  - Runs Playwright tests against that server
  - Shuts server down on completion or error
*/

import { spawn } from 'node:child_process'
import net from 'node:net'
import process from 'node:process'

async function getFreePort(start = 3000) {
  // Find an available port by asking OS for 0 or scanning upwards from start
  const port = await new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      const p = typeof addr === 'object' && addr ? addr.port : start
      srv.close(() => resolve(p))
    })
  })
  return port
}

function run(command, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts })
    child.on('exit', (code) => {
      code === 0 ? resolve(0) : reject(Object.assign(new Error(`${command} ${args.join(' ')} exited with ${code}`), { code }))
    })
    child.on('error', reject)
  })
}

function start(command, args, opts = {}) {
  const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts })
  return child
}

async function waitOnUrl(url, timeoutMs = 120000) {
  const startTs = Date.now()
  while (Date.now() - startTs < timeoutMs) {
    try {
  const res = await fetch(url, { cache: 'no-store' })
  // Consider server ready if it responds (200-499). 5xx likely means still booting; keep waiting.
  if (res && res.status >= 200 && res.status < 500) return
    } catch { /* ignore until ready */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function main() {
  const args = process.argv.slice(2)
  const port = await getFreePort()
  const host = '127.0.0.1'
  const baseUrl = `http://${host}:${port}`

  // Build once
  await run('npm', ['run', 'build'])

  // Start server (no prestart build) using our chosen port and host explicitly
  const serverEnv = { ...process.env, E2E: '1' }
  const server = start('npx', ['next', 'start', '-p', String(port), '-H', host], { env: serverEnv })

  let shuttingDown = false
  const shutdown = async () => {
    if (shuttingDown) return
    shuttingDown = true
    try { server.kill() } catch {}
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('exit', shutdown)

  try {
    // Wait until server is responsive
    // Wait until server is responsive (try both host and localhost)
    try {
      await waitOnUrl(baseUrl)
    } catch {
      await waitOnUrl(`http://localhost:${port}`)
    }

    // Run Playwright with env pointing to our server and skip webServer from config
  const pwEnv = { ...process.env, SKIP_WEB_SERVER: '1', PORT: String(port), BASE_URL: baseUrl, E2E: '1' }
    const pwArgs = ['playwright', 'test', ...args]
    await run('npx', pwArgs, { env: pwEnv })
  } finally {
    await shutdown()
  }
}

main().catch((e) => {
  console.error(e?.message || e)
  process.exit(typeof e?.code === 'number' ? e.code : 1)
})
