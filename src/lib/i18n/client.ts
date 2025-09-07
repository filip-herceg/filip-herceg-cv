"use client"
import { useEffect, useState, useCallback } from 'react'
import { defaultLocale, getSyncMessages, loadMessages } from './index'

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
