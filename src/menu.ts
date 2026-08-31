import { parseAllergens, type AllergenId } from './allergens.ts'
import {
  isMenuItemId,
  menuCategories,
  priceCentsForSlug,
  type MenuCategoryId,
  type MenuItemId,
} from './content.ts'
import { copy } from './i18n/copy.ts'
import { LOCALES, type Locale } from './i18n/locales.ts'

export type StoredMenuItem = {
  id: string
  slug: string
  category_id: MenuCategoryId
  name_es: string
  name_en: string
  name_ja: string
  blurb_es: string
  blurb_en: string
  image_url: string
  vegetarian: boolean
  sort_order: number
  published: boolean
  allergens: AllergenId[]
  price_cents: number
}

const FALLBACK_ALLERGENS: Record<MenuItemId, AllergenId[]> = {
  edamame: ['soy'],
  gyozaPork: ['gluten', 'soy', 'sesame'],
  gyozaVeg: ['gluten', 'soy', 'sesame'],
  takoyaki: ['gluten', 'eggs', 'fish', 'soy', 'molluscs'],
  mushrooms: ['gluten', 'soy', 'milk'],
  sushi: ['gluten', 'eggs', 'fish', 'soy', 'sesame'],
  sashimi: ['gluten', 'fish', 'soy'],
  hotPhilly: ['gluten', 'eggs', 'fish', 'soy', 'milk', 'sesame'],
  katsudon: ['gluten', 'eggs', 'fish', 'soy'],
  katsuCurry: ['gluten', 'eggs', 'soy', 'milk', 'celery'],
  yakinikuDon: ['gluten', 'soy', 'sesame'],
  karaageCurry: ['gluten', 'eggs', 'soy', 'milk', 'celery'],
  okonomiyaki: ['gluten', 'eggs', 'fish', 'soy'],
  yakisoba: ['gluten', 'soy', 'sesame'],
  tempuraUdon: ['gluten', 'crustaceans', 'eggs', 'fish', 'soy'],
  friedTofu: ['gluten', 'soy'],
  appleGyoza: ['gluten'],
  mochi: [],
  japaneseBeer: ['gluten'],
}

function parsePriceCents(row: Record<string, unknown>, slug: string): number {
  if ('price_cents' in row && row.price_cents !== null && row.price_cents !== undefined) {
    const fromCents = Number(row.price_cents)
    if (Number.isFinite(fromCents) && fromCents >= 0) {
      return Math.round(fromCents)
    }
  }
  if ('price' in row && row.price !== null && row.price !== undefined) {
    const fromEuros = Number(row.price)
    if (Number.isFinite(fromEuros) && fromEuros >= 0) {
      return Math.round(fromEuros * 100)
    }
  }
  return priceCentsForSlug(slug)
}

function resolvedAllergens(slug: string, raw: unknown): AllergenId[] {
  const parsed = parseAllergens(raw)
  if (parsed.length > 0) {
    return parsed
  }
  if (isMenuItemId(slug)) {
    return FALLBACK_ALLERGENS[slug]
  }
  return parsed
}

export function parseStoredMenuItem(value: unknown): StoredMenuItem | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const row = value as Record<string, unknown>
  const sortOrder = Number(row.sort_order)
  if (
    typeof row.id !== 'string' ||
    typeof row.slug !== 'string' ||
    !isMenuCategoryId(row.category_id) ||
    typeof row.name_es !== 'string' ||
    typeof row.name_en !== 'string' ||
    typeof row.name_ja !== 'string' ||
    typeof row.blurb_es !== 'string' ||
    typeof row.blurb_en !== 'string' ||
    typeof row.image_url !== 'string' ||
    typeof row.vegetarian !== 'boolean' ||
    !Number.isFinite(sortOrder) ||
    typeof row.published !== 'boolean'
  ) {
    return null
  }
  return {
    id: row.id,
    slug: row.slug,
    category_id: row.category_id,
    name_es: row.name_es,
    name_en: row.name_en,
    name_ja: row.name_ja,
    blurb_es: row.blurb_es,
    blurb_en: row.blurb_en,
    image_url: row.image_url,
    vegetarian: row.vegetarian,
    sort_order: Math.floor(sortOrder),
    published: row.published,
    allergens: resolvedAllergens(row.slug, row.allergens),
    price_cents: parsePriceCents(row, row.slug),
  }
}

export const MENU_CATEGORY_IDS: MenuCategoryId[] = [
  'starters',
  'sushi',
  'mains',
  'dessert',
  'drinks',
]

export function isMenuCategoryId(value: unknown): value is MenuCategoryId {
  switch (value) {
    case 'starters':
    case 'sushi':
    case 'mains':
    case 'dessert':
    case 'drinks':
      return true
    default:
      return false
  }
}

export function categoryHeading(id: MenuCategoryId, label: string): string {
  switch (id) {
    case 'starters':
    case 'sushi':
    case 'mains':
    case 'dessert':
    case 'drinks':
      return label
    default: {
      const _exhaustive: never = id
      return _exhaustive
    }
  }
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    if (value?.trim()) {
      return value
    }
  }
  return ''
}

export function catalogCopy(slug: string, locale: Locale) {
  if (!isMenuItemId(slug)) {
    return null
  }
  return copy[locale].cartaItems[slug]
}

export function displayMenuItem(item: StoredMenuItem, locale: Locale) {
  const fromCatalog = catalogCopy(item.slug, locale)
  switch (locale) {
    case 'es':
      return { name: item.name_es, blurb: item.blurb_es }
    case 'en':
      return {
        name: firstNonEmpty(item.name_en, item.name_es),
        blurb: firstNonEmpty(item.blurb_en, item.blurb_es),
      }
    case 'ja':
      return {
        name: firstNonEmpty(item.name_ja, item.name_es, fromCatalog?.name),
        blurb: firstNonEmpty(item.blurb_en, item.blurb_es, fromCatalog?.blurb),
      }
    case 'pt-BR':
      return {
        name: firstNonEmpty(item.name_es, item.name_en, fromCatalog?.name),
        blurb: firstNonEmpty(item.blurb_es, item.blurb_en, fromCatalog?.blurb),
      }
    default: {
      const _exhaustive: never = locale
      return _exhaustive
    }
  }
}

function normalizeDishName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

export function categoryIdFromLabel(label: string): MenuCategoryId | null {
  const trimmed = label.trim()
  if (isMenuCategoryId(trimmed)) {
    return trimmed
  }
  const needle = normalizeDishName(trimmed)
  if (!needle) {
    return null
  }
  for (const locale of LOCALES) {
    for (const id of MENU_CATEGORY_IDS) {
      if (normalizeDishName(copy[locale].cartaCategories[id]) === needle) {
        return id
      }
    }
  }
  return null
}

export function categoryIdForDishName(name: string): MenuCategoryId | null {
  const needle = normalizeDishName(name)
  if (!needle) {
    return null
  }
  for (const category of menuCategories) {
    for (const item of category.items) {
      const names = [
        item.nameJa,
        item.nameRomaji,
        copy.es.cartaItems[item.id].name,
        copy.en.cartaItems[item.id].name,
        copy.ja.cartaItems[item.id].name,
        copy['pt-BR'].cartaItems[item.id].name,
      ]
      if (names.some((candidate) => normalizeDishName(candidate) === needle)) {
        return category.id
      }
    }
  }
  return null
}

export function resolveTableMenuCategory(
  name: string,
  categoryHint: string | null,
): string {
  if (categoryHint) {
    const fromHint = categoryIdFromLabel(categoryHint)
    if (fromHint) {
      return fromHint
    }
  }
  const fromName = categoryIdForDishName(name)
  if (fromName) {
    return fromName
  }
  const leftover = categoryHint?.trim()
  return leftover || 'other'
}

export function groupMenuByCategory(
  items: StoredMenuItem[],
): { id: MenuCategoryId; items: StoredMenuItem[] }[] {
  return MENU_CATEGORY_IDS.flatMap((id) => {
    const grouped = items
      .filter((item) => item.category_id === id)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
    if (grouped.length === 0) {
      return []
    }
    return [{ id, items: grouped }]
  })
}

export function fallbackMenuItems(): StoredMenuItem[] {
  const es = copy.es.cartaItems
  const en = copy.en.cartaItems
  let sort = 10
  return menuCategories.flatMap((category) =>
    category.items.map((item) => {
      const current = sort
      sort += 10
      return {
        id: item.id,
        slug: item.id,
        category_id: category.id,
        name_es: es[item.id].name,
        name_en: en[item.id].name,
        name_ja: item.nameJa,
        blurb_es: es[item.id].blurb,
        blurb_en: en[item.id].blurb,
        image_url: item.image ?? '',
        vegetarian: Boolean(item.vegetarian),
        sort_order: current,
        published: true,
        allergens: FALLBACK_ALLERGENS[item.id],
        price_cents: item.priceCents,
      }
    }),
  )
}

export function slugFromName(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'plato'
}
