import { type CvData, type CvDesign } from './schema'
import { defaultSeedData, defaultSeedDesign, type CvStorageBackend } from './storage'

type Locale = 'en' // future extension

interface Cached {
  data: Record<Locale, CvData>
  design: Record<Locale, CvDesign>
}

// In-memory cache (pure runtime) fed from selected storage backend
const cache: Cached = { data: {} as Record<Locale, CvData>, design: {} as Record<Locale, CvDesign> }

// Selected storage backend (db or memory) controlled by CV_STORAGE env; resolved lazily
let backend: CvStorageBackend | undefined

// Runtime flags
function canUseDatabase() {
  const url = process.env.DATABASE_URL || ''
  // Only allow obvious Postgres URLs; anything else is treated as unavailable
  return Boolean(url.startsWith('postgresql://') || url.startsWith('postgres://'))
}

// Only auto-seed when explicitly enabled AND a database is configured.
// Default is OFF to avoid touching DB during builds or without an explicit opt-in.
function shouldAutoSeed() {
  if (process.env.CV_AUTO_SEED !== 'true') return false
  if (!canUseDatabase()) return false
  return true
}

async function initBackendIfNeeded() {
  if (!backend) {
    const { createStorage } = await import('./storage')
    backend = createStorage()
  }
}

function setDefaults(locale: Locale) {
  cache.data[locale] = defaultSeedData
  cache.design[locale] = defaultSeedDesign
}

function setFromAgg(locale: Locale, agg: { data: CvData; design: CvDesign }) {
  cache.data[locale] = agg.data
  cache.design[locale] = agg.design
}

async function handleEmpty(locale: Locale) {
  if (!shouldAutoSeed()) {
    setDefaults(locale)
    return
  }

  if (!backend?.seedIfEmpty) {
    setDefaults(locale)
    return
  }

  try {
    await backend.seedIfEmpty(locale, defaultSeedData, defaultSeedDesign)
    const seeded = await backend.get(locale)
    if (seeded.source !== 'empty') {
      setFromAgg(locale, seeded)
      return
    }
  } catch {
    // ignore and fall back to defaults
  }

  setDefaults(locale)
}

async function ensure(locale: Locale) {
  await initBackendIfNeeded()
  if (cache.data[locale]) return

  const agg = await backend!.get(locale)
  if (agg.source !== 'empty') {
    setFromAgg(locale, agg)
    return
  }

  await handleEmpty(locale)
}

export async function getCvData(locale: Locale = 'en'): Promise<CvData> {
  await ensure(locale)
  return cache.data[locale]
}

export async function getCvDesign(locale: Locale = 'en'): Promise<CvDesign> {
  await ensure(locale)
  return cache.design[locale]
}
