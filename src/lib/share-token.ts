import crypto from 'node:crypto'

// Token payload minimal fields
export interface SharePayload {
  id: string
  presetId: string
  exp: number // unix seconds
  scope: 'latest_preset_export'
}

const ALG = 'sha256'

function base64url(buf: Buffer) {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function signShareToken(payload: SharePayload, secret = process.env.SHARE_TOKEN_SECRET || ''): string {
  if (!secret) throw new Error('SHARE_TOKEN_SECRET missing')
  const header = { alg: 'HS256', typ: 'JWT' }
  const encHeader = base64url(Buffer.from(JSON.stringify(header)))
  const encPayload = base64url(Buffer.from(JSON.stringify(payload)))
  const data = `${encHeader}.${encPayload}`
  const sig = crypto.createHmac(ALG, secret).update(data).digest()
  const encSig = base64url(sig)
  return `${data}.${encSig}`
}

export function verifyShareToken(token: string, secret = process.env.SHARE_TOKEN_SECRET || ''): SharePayload | null {
  try {
    if (!secret) return null
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [h, p, s] = parts
    const data = `${h}.${p}`
    const expected = base64url(crypto.createHmac(ALG, secret).update(data).digest())
    if (!crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return null
    const payload = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')) as SharePayload
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null
    if (payload.scope !== 'latest_preset_export') return null
    return payload
  } catch {
    return null
  }
}
