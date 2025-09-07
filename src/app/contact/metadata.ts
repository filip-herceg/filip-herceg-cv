import { localizedMeta, localeFromHeaders } from '@/lib/i18n'

export async function generateMetadata() {
  const locale = localeFromHeaders()
  return localizedMeta(locale, 'contact', { path: 'contact' })
}
