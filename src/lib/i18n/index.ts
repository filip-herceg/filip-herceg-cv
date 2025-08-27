import en from './messages.en.json'
import de from './messages.de.json'

export const messages: Record<string, Record<string, string>> = { en, de }

export function t(locale: string, key: string): string {
  const dict = messages[locale] || messages.en
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


