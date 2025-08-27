import en from './messages.en.json'
import de from './messages.de.json'

export const messages: Record<string, Record<string,string>> = { en, de }

export function t(locale: string, key: string): string {
  const dict = messages[locale] || messages.en
  return dict[key] || key
}
