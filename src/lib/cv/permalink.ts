import { CvSelectionSchema } from './schema'

// Polyfill atob/btoa for Node environments (SSR / tests)
if (typeof (globalThis as any).atob === 'undefined') {
  ;(globalThis as any).atob = (str: string) => Buffer.from(str, 'base64').toString('binary')
}
if (typeof (globalThis as any).btoa === 'undefined') {
  ;(globalThis as any).btoa = (str: string) => Buffer.from(str, 'binary').toString('base64')
}

// Lightweight base64url helpers (no padding)
function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_')
}
function fromBase64Url(str: string): Uint8Array {
  const b64 = str.replace(/-/g,'+').replace(/_/g,'/') + '==='.slice((str.length + 3) % 4)
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// Raw DEFLATE via CompressionStream (browser) / fallback to no compression in Node if absent
async function deflate(data: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream !== 'undefined') {
    const cs = new CompressionStream('deflate-raw')
    const writer = cs.writable.getWriter()
  await writer.write(new Uint8Array(data))
    await writer.close()
    const buf = await new Response(cs.readable).arrayBuffer()
    return new Uint8Array(buf)
  }
  // Fallback: return original (small penalty, acceptable for tests)
  return data
}
async function inflate(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const ds = new DecompressionStream('deflate-raw')
      const writer = ds.writable.getWriter()
      await writer.write(new Uint8Array(data))
      await writer.close()
      const buf = await new Response(ds.readable).arrayBuffer()
      return new Uint8Array(buf)
    } catch {
      // Gracefully treat bytes as already uncompressed (e.g. token created without compression)
      return data
    }
  }
  // Environment lacks DecompressionStream – treat as uncompressed
  return data
}

export interface PresetSelection {
  skills?: string[]
  projects?: string[]
  experiences?: string[]
  education?: string[]
  mode?: 'short'
  v?: number // version (default 1)
}

interface Ok { ok: true; preset: PresetSelection }
interface Err { ok: false; reason: string; version?: number }
export type DecodeResult = Ok | Err

function sanitize(selection: PresetSelection): PresetSelection {
  const out: PresetSelection = {}
  for (const key of ['skills','projects','experiences','education'] as const) {
    const arr = selection[key]
    if (Array.isArray(arr) && arr.length) {
      const uniq = Array.from(new Set(arr.filter(Boolean)))
      if (uniq.length) out[key] = uniq.sort((a,b)=>a.localeCompare(b))
    }
  }
  if (selection.mode === 'short') out.mode = 'short'
  if (selection.v && selection.v !== 1) out.v = selection.v
  return out
}

export async function encodePreset(selection: PresetSelection): Promise<string> {
  const canonical = sanitize(selection)
  const json = JSON.stringify(canonical)
  const bytes = new TextEncoder().encode(json)
  const deflated = await deflate(bytes)
  return toBase64Url(deflated)
}

export async function buildPermalink(baseUrl: string, selection: PresetSelection): Promise<string> {
  const token = await encodePreset(selection)
  const url = new URL(baseUrl)
  url.searchParams.set('cv', token)
  return url.toString()
}

export async function decodePreset(input: string | URLSearchParams): Promise<DecodeResult> {
  const token = typeof input === 'string' ? input : input.get('cv') || ''
  if (!token) return { ok:false, reason:'missing' }
  let bytes: Uint8Array
  try { bytes = fromBase64Url(token) } catch { return { ok:false, reason:'b64' } }
  if (bytes.length > 2048) return { ok:false, reason:'too_large' }
  let inflated: Uint8Array
  // The inflate helper currently never throws (internal errors are swallowed and original bytes are returned),
  // so this catch branch is defensive and effectively unreachable. Mark ignored for coverage.
  try { inflated = await inflate(bytes) } catch { /* c8 ignore next */ return { ok:false, reason:'inflate' } }
  let obj: any
  try { obj = JSON.parse(new TextDecoder().decode(inflated)) } catch { return { ok:false, reason:'json' } }
  const version = obj.v ?? 1
  if (version !== 1) return { ok:false, reason:'unsupported_version', version }
  // Convert to query-like object to leverage existing selection schema transform
  const queryShape: Record<string,string> = {}
  for (const k of ['skills','projects','experiences','education'] as const) {
    if (Array.isArray(obj[k]) && obj[k].every((x: any)=> typeof x === 'string')) {
      queryShape[k] = obj[k].join(',')
    }
  }
  if (obj.mode === 'short') queryShape.mode = 'short'
  try {
    const parsed = CvSelectionSchema.parse(queryShape)
    const preset: PresetSelection = { ...parsed, v: version }
    return { ok:true, preset }
  } catch {
    return { ok:false, reason:'invalid_payload' }
  }
}

// Synchronous convenience for expanded query parameters (no compression) – used if `cv` absent
export function selectionFromExpanded(params: URLSearchParams): PresetSelection {
  const raw: Record<string,string> = {}
  for (const key of ['skills','projects','experiences','education','mode']) {
    const v = params.get(key)
    if (v) raw[key] = v
  }
  try {
    const parsed = CvSelectionSchema.parse(raw)
    return sanitize(parsed)
  } catch {
    return {}
  }
}
