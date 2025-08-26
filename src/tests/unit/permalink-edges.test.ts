import { describe, it, expect } from 'vitest'
import { decodePreset } from '@/lib/cv/permalink'

function makeToken(byteCount: number) {
  // produce base64url token of desired length > 2048 bytes after decoding check by building a large array
  const arr = new Uint8Array(byteCount).fill(65)
  // minimal base64url encoder
  let bin = ''
  for (const b of arr) bin += String.fromCharCode(b)
  const b64 = Buffer.from(bin, 'binary').toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_')
  return b64
}

describe('permalink edge branches', () => {
  it('returns too_large when decoded bytes exceed limit', async () => {
    const token = makeToken(2050) // > 2048
    const r = await decodePreset(token)
    expect(r).toMatchObject({ ok:false, reason:'too_large' })
  })

  it('returns b64 on malformed base64url', async () => {
    const r = await decodePreset('*not-valid*')
    expect(r).toMatchObject({ ok:false, reason:'b64' })
  })

  it('returns json on invalid JSON', async () => {
    // Craft token that decodes to invalid UTF/JSON by giving random bytes not forming JSON
    const bad = new Uint8Array([0,159,255,10])
    let bin = ''
    for (const b of bad) bin += String.fromCharCode(b)
    const token = Buffer.from(bin,'binary').toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_')
    const r = await decodePreset(token)
    expect(r).toMatchObject({ ok:false, reason:'json' })
  })

  it('returns unsupported_version for version !=1', async () => {
    const raw = { v: 2, skills:['a'] }
    const json = JSON.stringify(raw)
    const bytes = new TextEncoder().encode(json)
    let bin = ''
    for (const b of bytes) bin += String.fromCharCode(b)
    const token = Buffer.from(bin,'binary').toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_')
    const r = await decodePreset(token)
    expect(r).toMatchObject({ ok:false, reason:'unsupported_version', version:2 })
  })
})
