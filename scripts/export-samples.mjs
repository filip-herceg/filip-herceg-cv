// Save two sample PDFs (full and short) into reports/exports/YYYY-MM-DD
import fs from 'node:fs/promises'
import path from 'node:path'
import http from 'node:http'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000'
const today = new Date()
const yyyy = String(today.getFullYear())
const mm = String(today.getMonth() + 1).padStart(2, '0')
const dd = String(today.getDate()).padStart(2, '0')
const dir = path.join('reports', 'exports', `${yyyy}-${mm}-${dd}`)

async function ensureDir(p) { await fs.mkdir(p, { recursive: true }) }

function download(url, outFile) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        res.resume()
        return
      }
      const chunks = []
      res.on('data', (c) => chunks.push(Buffer.from(c)))
      res.on('end', async () => {
        try {
          const buf = Buffer.concat(chunks)
          await fs.writeFile(outFile, buf)
          resolve()
        } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(new Error('timeout')) })
  })
}

async function main() {
  await ensureDir(dir)
  const fullUrl = `${BASE}/api/cv/pdf`
  const shortUrl = `${BASE}/api/cv/pdf?mode=short`
  const fullPath = path.join(dir, 'cv-full.pdf')
  const shortPath = path.join(dir, 'cv-short.pdf')
  await download(fullUrl, fullPath)
  console.log(`Saved: ${fullPath}`)
  await download(shortUrl, shortPath)
  console.log(`Saved: ${shortPath}`)
}

main().catch((e) => { console.error('export-samples failed:', e.message || e); process.exit(1) })
