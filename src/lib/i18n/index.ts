import en from './messages.en.json'
import de from './messages.de.json'
// NOTE: German kept eagerly for now to preserve SSR correctness; additional locales will be lazy.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lazyCache: Record<string, Record<string, string>> = { en, de }

export const messages: Record<string, Record<string, string>> = lazyCache

async function loadLocale(locale: string): Promise<Record<string, string>> {
  if (lazyCache[locale]) return lazyCache[locale]
  switch (locale) {
    case 'de':
      return lazyCache.de
    default:
      return lazyCache.en
  }
}

export function t(locale: string, key: string): string {
  const dict = messages[locale] || messages.en
  return dict[key] || key
}

// Async variant that ensures the catalog is loaded (used for future client-side code splitting / Suspense patterns)
export async function tAsync(locale: string, key: string): Promise<string> {
  const dict = await loadLocale(locale)
  return dict[key] || key
}

function localeToOg(locale: string) {
  // Map simple locale code to OpenGraph locale format
  switch (locale) {
    case 'de':
      return 'de_DE'
    case 'en':
    default:
      return 'en_US'
  }
}

// Build localized metadata including OpenGraph + language alternates.
// opts.path should be the route segment ('' for home) without leading slash.
export function localizedMeta(locale: string, keyBase: string, opts?: { path?: string }) {
  const title = t(locale, `meta.${keyBase}.title`)
  const description = t(locale, `meta.${keyBase}.description`)
  const path = opts?.path || ''
  const siteUrl = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const suffix = path ? `/${path}` : ''
  const canonical = `${siteUrl}${suffix}`
  const locales = ['en', 'de']
  const languages: Record<string, string> = {}
  for (const l of locales.slice(1)) languages[l] = `${siteUrl}/${l}${suffix}`
  languages['x-default'] = canonical
  return {
    title,
    description,
    alternates: { canonical, languages },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Filip Herceg',
      type: 'website',
      locale: localeToOg(locale),
      alternateLocale: locales.filter(l => l !== locale).map(localeToOg),
    },
  }
}

// Reusable helpers for detecting locale to remove duplication in pages.
export function detectLocaleFromPath(path: string | undefined | null): 'en' | 'de' {
  if (!path) return 'en'
  const seg = path.split('/').filter(Boolean)[0]
  return seg === 'de' ? 'de' : 'en'
}

// Server-side: derive locale from Next headers() (middleware sets x-pathname)
export function localeFromHeaders(): 'en' | 'de' {
  try {
    // Dynamically require to avoid Next edge/runtime issues when imported client-side.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { headers } = require('next/headers') as typeof import('next/headers')
    const h = headers()
    const path = h.get('x-pathname') || ''
    return detectLocaleFromPath(path)
  } catch {
    return 'en'
  }
}


