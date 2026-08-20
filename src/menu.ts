import type { Locale, MenuCategoryId } from './content.ts'
import { menuCategories, copy } from './content.ts'

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

export function displayMenuItem(item: StoredMenuItem, locale: Locale) {
  switch (locale) {
    case 'es':
      return { name: item.name_es, blurb: item.blurb_es }
    case 'en':
      return { name: item.name_en, blurb: item.blurb_en }
    default: {
      const _exhaustive: never = locale
      return _exhaustive
    }
  }
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
