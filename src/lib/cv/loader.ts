import { type CvData, type CvDesign } from './schema'
import { createStorage, defaultSeedData, defaultSeedDesign } from './storage'

type Locale = 'en' // future extension

interface Cached {
  data: Record<Locale, CvData>
  design: Record<Locale, CvDesign>
}

// In-memory cache (pure runtime) fed from selected storage backend
const cache: Cached = { data: {} as Record<Locale, CvData>, design: {} as Record<Locale, CvDesign> }

// Selected storage backend (db or memory) controlled by CV_STORAGE env
const backend = createStorage()

// Flag: disable automatic DB seeding by setting CV_AUTO_SEED=false
const AUTO_SEED = process.env.CV_AUTO_SEED !== 'false'

async function ensure(locale: Locale) {
  if (cache.data[locale]) return
  const agg = await backend.get(locale)
  if (agg.source === 'empty') {
    if (AUTO_SEED) {
      if (backend.seedIfEmpty) {
        await backend.seedIfEmpty(locale, defaultSeedData, defaultSeedDesign)
        const seeded = await backend.get(locale)
        cache.data[locale] = seeded.data
        cache.design[locale] = seeded.design
      } else {
        cache.data[locale] = defaultSeedData
        cache.design[locale] = defaultSeedDesign
      }
    } else {
      // Use ephemeral in-memory seed only (tests / dev scenarios)
      cache.data[locale] = defaultSeedData
      cache.design[locale] = defaultSeedDesign
    }
  } else {
    cache.data[locale] = agg.data
    cache.design[locale] = agg.design
  }
}

export async function getCvData(locale: Locale = 'en'): Promise<CvData> {
  await ensure(locale)
  return cache.data[locale]
}

export async function getCvDesign(locale: Locale = 'en'): Promise<CvDesign> {
  await ensure(locale)
  return cache.design[locale]
}
