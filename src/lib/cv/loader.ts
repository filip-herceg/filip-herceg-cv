import cvEn from './data/cv.en.json'
import designEn from './data/design.en.json'
import { CvDataSchema, CvDesignSchema, type CvData, type CvDesign } from './schema'

type Locale = 'en' // future extension

interface Cached {
  data: Record<Locale, CvData>
  design: Record<Locale, CvDesign>
}

// TODO(F16): Replace static JSON bootstrap with dynamic DB-backed loading.
// Loading order after persistence feature:
// 1. Attempt fetch from DB (by locale)
// 2. If empty and static seed JSON exists, import once then persist
// 3. Cache result and return
const cache: Cached = {
  data: { en: CvDataSchema.parse(cvEn) },
  design: { en: CvDesignSchema.parse(designEn) }
}

export function getCvData(locale: Locale = 'en'): CvData {
  return cache.data[locale]
}

export function getCvDesign(locale: Locale = 'en'): CvDesign {
  return cache.design[locale]
}
