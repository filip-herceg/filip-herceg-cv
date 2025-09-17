// Boot-time warmup for Chromium pool (optional)
// Enabled when PDF_CHROMIUM_POOL_PRIME=true

import { warmChromiumPool } from '@/lib/pdf/chromium-pool'

let primed = false

export async function primeChromiumPool(): Promise<void> {
  if (primed) return
  if ((process.env.PDF_CHROMIUM_POOL_PRIME || 'false').toLowerCase() !== 'true') return
  try {
    await warmChromiumPool()
    primed = true
  } catch {
    // best-effort: ignore failures at boot
  }
}
