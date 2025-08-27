import en from './messages.en.json'
import de from './messages.de.json'

export const messages: Record<string, Record<string,string>> = { en, de }

export function t(locale: string, key: string): string {
  const dict = messages[locale] || messages.en
  return dict[key] || key
}

// Basic localized metadata builder (can be expanded later)
export function localizedMeta(locale: string, keyBase: string) {
  return {
    title: t(locale, `meta.${keyBase}.title`),
    description: t(locale, `meta.${keyBase}.description`),
  }
}


