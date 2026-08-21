import { en } from './en.ts'
import { es } from './es.ts'
import { ja } from './ja.ts'
import { type Locale } from './locales.ts'
import { ptBR } from './pt-BR.ts'
import type { Copy } from './types.ts'

export type { Copy }

export const copy: Record<Locale, Copy> = {
  es,
  en,
  ja,
  'pt-BR': ptBR,
}
