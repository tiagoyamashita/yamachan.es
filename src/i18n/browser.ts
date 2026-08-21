import {
  LOCALE_STORAGE_KEY,
  resolveLocale,
  type Locale,
} from './locales.ts'

export function detectLocale(): Locale {
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  const languages = [
    window.navigator.language,
    ...(window.navigator.languages ?? []),
  ]
  return resolveLocale(stored, languages)
}

export function persistLocale(locale: Locale) {
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
}
