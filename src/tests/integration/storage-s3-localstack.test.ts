/*
 Integration test for S3 backend using optional Localstack (if env vars provided).
 Skips automatically when S3_ENDPOINT or S3_BUCKET not set to avoid CI failures.
*/
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

// Only run if explicit Localstack style configuration present
const shouldRun = !!process.env.S3_ENDPOINT && !!process.env.S3_BUCKET && (process.env.CV_STORAGE?.toLowerCase() === 's3')

// Dynamic imports inside tests to avoid impacting other suites

async function metricValueForBackend(counter: any, backend: string) { // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    const metrics: any = await new Promise(resolve => counter.collect?.((m: any) => resolve(m))) // eslint-disable-line @typescript-eslint/no-explicit-any
    return metrics?.values?.find((v: any) => v.labels?.backend === backend)?.value || 0 // eslint-disable-line @typescript-eslint/no-explicit-any
  } catch { return 0 }
}

describe.skipIf(!shouldRun)('S3 backend (Localstack integration)', () => {
  let storage: any // eslint-disable-line @typescript-eslint/no-explicit-any
  beforeAll(async () => {
    // Ensure env set for createStorage
    process.env.CV_STORAGE = 's3'
    process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1'
    const { createStorage } = await import('../../lib/cv/storage')
    storage = createStorage()
  })

  afterAll(async () => {
    try { await storage?.close?.() } catch {}
  })

  it('miss then hit lifecycle', async () => {
  const { cvCacheHitsTotal, cvCacheMissesTotal } = await import('../../lib/metrics')
  const missBefore = await metricValueForBackend(cvCacheMissesTotal, 's3')
    await storage.get('en') // expect miss + population (db path)
  const missAfter = await metricValueForBackend(cvCacheMissesTotal, 's3')
    expect(missAfter).toBe(missBefore + 1)
    await storage.get('en') // expect hit
  const hitAfter = await metricValueForBackend(cvCacheHitsTotal, 's3')
    expect(hitAfter).toBeGreaterThan(0)
  })

  it('invalidate * removes cached objects', async () => {
    await storage.get('en')
    await storage.invalidate('*')
    // Next call should count as miss again
  const { cvCacheMissesTotal } = await import('../../lib/metrics')
  const missBefore = await metricValueForBackend(cvCacheMissesTotal, 's3')
    await storage.get('en')
  const missAfter = await metricValueForBackend(cvCacheMissesTotal, 's3')
    expect(missAfter).toBe(missBefore + 1)
  })
})
