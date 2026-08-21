import { restaurant } from '../content.ts'
import { copy } from './copy.ts'
import {
  LOCALES,
  formatRating,
  isLocale,
  localeMeta,
  showJapaneseCaption,
  type Locale,
} from './locales.ts'
import type { Copy } from './types.ts'

export type { Copy, Locale }
export {
  LOCALES,
  copy,
  formatRating,
  isLocale,
  localeMeta,
  showJapaneseCaption,
}

export { detectLocale, persistLocale } from './browser.ts'

export function whatsappUrl(text: string): string {
  return (
    `https://wa.me/${restaurant.whatsappNumber}?text=` +
    encodeURIComponent(text)
  )
}

export function mapsEmbedUrl(locale: Locale): string {
  return restaurant.mapsEmbed.replace(
    'hl=es',
    `hl=${localeMeta[locale].mapsLang}`,
  )
}
