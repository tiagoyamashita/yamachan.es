// Register a locale here, add src/i18n/<code>.ts, then wire it in copy.ts.
export const LOCALES = ['es', 'en', 'ja', 'pt-BR'] as const

export type Locale = (typeof LOCALES)[number]

export type LocaleMeta = {
  htmlLang: string
  mapsLang: string
  label: string
  shortLabel: string
}

export const localeMeta: Record<Locale, LocaleMeta> = {
  es: {
    htmlLang: 'es',
    mapsLang: 'es',
    label: 'Español',
    shortLabel: 'ES',
  },
  en: {
    htmlLang: 'en',
    mapsLang: 'en',
    label: 'English',
    shortLabel: 'EN',
  },
  ja: {
    htmlLang: 'ja',
    mapsLang: 'ja',
    label: '日本語',
    shortLabel: 'JA',
  },
  'pt-BR': {
    htmlLang: 'pt-BR',
    mapsLang: 'pt',
    label: 'Português',
    shortLabel: 'PT',
  },
}

export const LOCALE_STORAGE_KEY = 'yamachan-locale'

export function isLocale(value: unknown): value is Locale {
  switch (value) {
    case 'es':
    case 'en':
    case 'ja':
    case 'pt-BR':
      return true
    default:
      return false
  }
}

export function localeFromNavigator(language: string): Locale | null {
  const tag = language.toLowerCase()
  if (tag.startsWith('ja')) {
    return 'ja'
  }
  if (tag.startsWith('pt')) {
    return 'pt-BR'
  }
  if (tag.startsWith('en')) {
    return 'en'
  }
  if (tag.startsWith('es')) {
    return 'es'
  }
  return null
}

export function resolveLocale(
  stored: string | null,
  languages: readonly string[],
): Locale {
  if (isLocale(stored)) {
    return stored
  }
  for (const language of languages) {
    const matched = localeFromNavigator(language)
    if (matched) {
      return matched
    }
  }
  return 'es'
}

export function formatRating(value: number, locale: Locale): string {
  const formatted = value.toFixed(1)
  switch (locale) {
    case 'es':
    case 'pt-BR':
      return formatted.replace('.', ',')
    case 'en':
    case 'ja':
      return formatted
    default: {
      const _exhaustive: never = locale
      return _exhaustive
    }
  }
}

export function formatEuros(cents: number, locale: Locale): string {
  const formatted = (cents / 100).toFixed(2)
  const amount = (() => {
    switch (locale) {
      case 'es':
      case 'pt-BR':
        return formatted.replace('.', ',')
      case 'en':
      case 'ja':
        return formatted
      default: {
        const _exhaustive: never = locale
        return _exhaustive
      }
    }
  })()
  return `${amount} €`
}

export function showJapaneseCaption(locale: Locale): boolean {
  return locale !== 'ja'
}
