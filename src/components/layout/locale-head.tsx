"use client"
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const SUPPORTED = ['en','de'] as const
type Locale = typeof SUPPORTED[number]

function detectLocale(path: string): Locale {
  const seg = path.split('/').filter(Boolean)[0]
  if (SUPPORTED.includes(seg as Locale)) return seg as Locale
  return 'en'
}

export function LocaleHead() {
  const pathname = usePathname() || '/'
  const locale = detectLocale(pathname)
  // Derive path without leading locale for building alternates
  const segments = pathname.split('/').filter(Boolean)
  const withoutLocale = SUPPORTED.includes(segments[0] as Locale) ? '/' + segments.slice(1).join('/') : pathname
  const normalizedPath = withoutLocale === '/' ? '' : withoutLocale // avoid double slash

  useEffect(() => {
    // Set <html lang="..."> dynamically (App Router root layout is static)
    document.documentElement.lang = locale
  }, [locale])

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000'
  const base = siteUrl.replace(/\/$/, '')
  useEffect(() => {
    const enHref = `${base}${normalizedPath || '/'}`
    const deHref = `${base}/de${normalizedPath}`
    const specs: Array<[string,string]> = [
      ['en', enHref],
      ['de', deHref],
      ['x-default', enHref],
    ]
    // remove previous ones we manage
    document.querySelectorAll('link[data-locale-alt="true"]').forEach(l => l.parentElement?.removeChild(l))
    specs.forEach(([lang, href]) => {
      const link = document.createElement('link')
      link.setAttribute('rel','alternate')
      link.setAttribute('hrefLang', lang)
      link.setAttribute('href', href)
      link.setAttribute('data-locale-alt', 'true')
      document.head.appendChild(link)
    })
  }, [base, normalizedPath])

  return null
}
