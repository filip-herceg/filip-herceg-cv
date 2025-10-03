import http from 'node:http'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000'

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(Buffer.from(c)))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    })
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(new Error('timeout')) })
  })
}

async function main() {
  const txt = await fetchText(`${BASE}/api/metrics`)
  const lines = txt.split(/\r?\n/)
  const keys = [
    'pdf_cache_key_version',
    'pdf_bench_warm_p50_seconds',
    'pdf_generation_duration_seconds',
    'pdf_render_dom_duration_seconds',
    'chromium_acquire_duration_seconds',
    'pdf_requests_total',
  ]
  const out = []
  for (const k of keys) {
    const m = lines.filter((l) => l.startsWith(k))
    if (m.length) {
      out.push(`# ${k}`)
      out.push(...m.slice(0, 5))
    }
  }
  console.log(out.join('\n'))
}

main().catch((e) => { console.error('metrics-snippet failed:', e.message || e); process.exit(1) })
