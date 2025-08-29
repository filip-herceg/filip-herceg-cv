import { useEffect, useState, useCallback } from 'react'
import en from './messages.en.json'

// Default locale eagerly loaded; all others lazy via dynamic import.
// Cache to avoid repeated dynamic imports in client.
const catalogCache: Record<string, Record<string, string>> = { en }

export type Locale = 'en' | 'de'
export const defaultLocale: Locale = 'en'
export const supportedLocales: Locale[] = ['en','de']

export async function loadMessages(locale: string): Promise<Record<string,string>> {
  if (catalogCache[locale]) return catalogCache[locale]
  switch (locale) {
    case 'de': {
      const mod = await import('./messages.de.json')
      catalogCache[locale] = mod.default
      return catalogCache[locale]
    }
    default:
      return catalogCache.en
  }
}

export function getSyncMessages(locale: string): Record<string,string> {
  return catalogCache[locale] || catalogCache.en
}

export function translate(locale: string, key: string): string {
  const dict = getSyncMessages(locale)
  return dict[key] ?? key
}

export async function translateAsync(locale: string, key: string): Promise<string> {
  const dict = await loadMessages(locale)
  return dict[key] ?? key
}

export interface I18nApi {
  locale: string
  t: (key: string) => string
  ready: boolean
}

// React hook for client components; loads non-default catalogs lazily.
export function useI18n(locale: string): I18nApi {
  const initial = locale === defaultLocale ? getSyncMessages(locale) : undefined
  const [dict, setDict] = useState<Record<string,string> | undefined>(initial)
  useEffect(() => {
    let active = true
    if (locale === defaultLocale) {
      setDict(getSyncMessages(locale))
      return
    }
    // load lazily
    loadMessages(locale).then(d => { if (active) setDict(d) })
    return () => { active = false }
  }, [locale])

  const tFn = useCallback((key: string) => {
    if (!dict) return key // while loading show key (short wait)
    return dict[key] ?? key
  }, [dict])

  return { locale, t: tFn, ready: !!dict }
}

// Backwards compatible exports
export const t = (locale: string, key: string) => translate(locale, key)
export const tAsync = (locale: string, key: string) => translateAsync(locale, key)

// messages map kept for legacy usages (e.g. tests) but only includes loaded catalogs
export const messages: Record<string, Record<string,string>> = catalogCache

// localizedMeta kept as-is below

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

// Server-side: derive locale from Next headers() (middleware sets x-pathname) – sync helper
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function localeFromHeaders(): 'en' | 'de' {
  try {
  // next/headers only valid in server context; dynamic require acceptable here.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports -- server runtime only: synchronous helper needs headers()
  const mod = require('next/headers') as typeof import('next/headers')
  const h = mod.headers()
  // headers() in next/headers returns a Headers-like with get()
  // Cast to any to avoid importing next types in shared lib layer.
  const path = (h as unknown as { get: (k: string)=>string|undefined }).get('x-pathname') || ''
    return detectLocaleFromPath(path)
  } catch {
    return 'en'
  }
}


