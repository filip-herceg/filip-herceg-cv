import http from 'node:http'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000'

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body))
    const req = http.request(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const txt = Buffer.concat(chunks).toString('utf8')
        try { resolve({ status: res.statusCode || 0, json: JSON.parse(txt) }) } catch { resolve({ status: res.statusCode || 0, text: txt }) }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function main() {
  const ttlSeconds = 60 * 60 * 24 * 14 // 14 days
  // 1) Full Stack -> map to TECHNICAL preset
  const r1 = await postJson('/api/share/token', { presetId: 'TECHNICAL', ttlSeconds })
  if (r1.status !== 200 || !r1.json?.token) throw new Error('share token (TECHNICAL) failed: ' + (r1.text || r1.status))
  const short1 = `${BASE}/s/${encodeURIComponent(r1.json.token)}`
  console.log('Share (Full Stack/Technical):', short1)

  // 2) Generic (z. B. “Leadership” als nicht rein-technische Variante)
  const r2 = await postJson('/api/share/token', { presetId: 'LEADERSHIP', ttlSeconds })
  if (r2.status !== 200 || !r2.json?.token) throw new Error('share token (LEADERSHIP) failed: ' + (r2.text || r2.status))
  const short2 = `${BASE}/s/${encodeURIComponent(r2.json.token)}`
  console.log('Share (Generic/Leadership):', short2)
}

main().catch((e) => { console.error('create-share-links failed:', e.message || e); process.exit(1) })
