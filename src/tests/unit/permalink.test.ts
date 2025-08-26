import { describe, it, expect } from 'vitest'
import { encodePreset, decodePreset, selectionFromExpanded } from '@/lib/cv/permalink'

// Provide polyfills for atob/btoa under Node
if (!(globalThis as any).btoa) {
  (globalThis as any).btoa = (str: string) => Buffer.from(str, 'binary').toString('base64')
  ;(globalThis as any).atob = (str: string) => Buffer.from(str, 'base64').toString('binary')
}

describe('permalink encode/decode', () => {
  it('roundtrips simple selection, canonical order', async () => {
    const token = await encodePreset({ skills: ['b','a','a'], projects: ['p2','p1'], mode: 'short' })
    const decoded = await decodePreset(token)
    expect(decoded.ok).toBe(true)
    if (decoded.ok) {
      expect(decoded.preset.skills).toEqual(['a','b'])
      expect(decoded.preset.projects).toEqual(['p1','p2'])
      expect(decoded.preset.mode).toBe('short')
    }
  })

  it('returns error on malformed base64', async () => {
    const r = await decodePreset('@@bad@@')
    expect(r.ok).toBe(false)
  })

  it('selectionFromExpanded parses query params', () => {
    const sp = new URLSearchParams('skills=ts,react&mode=short')
    const sel = selectionFromExpanded(sp)
    expect(sel.skills).toEqual(['react','ts'])
    expect(sel.mode).toBe('short')
  })

  // Helper to build base64url tokens directly (no compression)
  const b64url = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_')

  it('returns missing when token absent', async () => {
    const r = await decodePreset('')
    expect(r.ok).toBe(false)
  })

  it('returns unsupported_version for future version', async () => {
    const json = JSON.stringify({ v: 2 })
    const token = b64url(new TextEncoder().encode(json))
    const r = await decodePreset(token)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('unsupported_version')
  })

  it('ignores unknown mode values (treated as success without mode)', async () => {
    const json = JSON.stringify({ mode: 'long', v: 1 })
    const token = b64url(new TextEncoder().encode(json))
    const r = await decodePreset(token)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.preset.mode).toBeUndefined()
    }
  })

  it('returns json error for invalid json bytes', async () => {
    const token = b64url(new TextEncoder().encode('{')) // truncated JSON
    const r = await decodePreset(token)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('json')
  })

  it('returns too_large when token exceeds limit', async () => {
    const big = new Uint8Array(2100).fill(65) // 'A'
    const token = b64url(big)
    const r = await decodePreset(token)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('too_large')
  })

  it('gracefully falls back when decompression fails (treated as uncompressed)', async () => {
    const json = JSON.stringify({ skills: ['x'] })
    const token = b64url(new TextEncoder().encode(json))
    const original = (globalThis as any).DecompressionStream
    ;(globalThis as any).DecompressionStream = class { constructor() { throw new Error('boom') } }
    const r = await decodePreset(token)
    ;(globalThis as any).DecompressionStream = original
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.preset.skills).toEqual(['x'])
  })

  it('selectionFromExpanded returns empty object for invalid payload', () => {
    const sp = new URLSearchParams('mode=long')
    const sel = selectionFromExpanded(sp)
    expect(Object.keys(sel).length).toBe(0)
  })
})
