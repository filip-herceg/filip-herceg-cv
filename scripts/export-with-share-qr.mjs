#!/usr/bin/env node
// Exports two PDFs (technical, leadership) embedding QR short links created via the share token API.
// Config via env:
// - TOKEN_BASE_URL: base URL to create tokens (defaults to http://127.0.0.1:3001)
// - RENDER_BASE_URL: base URL to render PDFs (defaults to TOKEN_BASE_URL)
// - OUT_DIR_BASE: base reports dir (defaults to reports/exports/YYYY-MM-DD)

import fs from 'node:fs'
import path from 'node:path'

const TOKEN_BASE_URL = process.env.TOKEN_BASE_URL || 'http://127.0.0.1:3001'
const RENDER_BASE_URL = process.env.RENDER_BASE_URL || TOKEN_BASE_URL

const presets = [
  { id: 'TECHNICAL', slug: 'technical' },
  { id: 'LEADERSHIP', slug: 'leadership' },
]

function todayDir() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return path.join('reports', 'exports', `${yyyy}-${mm}-${dd}`)
}

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true })
}

async function createToken(presetId, ttlSeconds = 60 * 60 * 24 * 14) {
  const url = `${TOKEN_BASE_URL.replace(/\/$/, '')}/api/share/token`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ presetId, ttlSeconds }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`createToken failed (${res.status}): ${text}`)
  }
  const json = await res.json()
  if (!json?.token) throw new Error('createToken response missing token')
  return json.token
}

async function fetchPdfWithQr(token) {
  const url = `${RENDER_BASE_URL.replace(/\/$/, '')}/api/cv/pdf?st=${encodeURIComponent(token)}`
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`fetchPdf failed (${res.status}): ${text}`)
  }
  const ab = await res.arrayBuffer()
  return new Uint8Array(ab)
}

async function main() {
  const outDir = process.env.OUT_DIR_BASE || todayDir()
  await ensureDir(outDir)

  for (const p of presets) {
    process.stdout.write(`Creating token for ${p.id}... `)
    const token = await createToken(p.id)
    console.log('ok')
    process.stdout.write(`Rendering PDF for ${p.id}... `)
    const bytes = await fetchPdfWithQr(token)
    const outFile = path.join(outDir, `cv-${p.slug}-qr.pdf`)
    await fs.promises.writeFile(outFile, bytes)
    console.log(`saved -> ${outFile}`)
  }

  console.log('Done.')
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err))
  process.exit(1)
})
