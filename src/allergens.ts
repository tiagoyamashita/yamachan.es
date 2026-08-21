export const ALLERGEN_IDS = [
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'peanuts',
  'soy',
  'milk',
  'nuts',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
  'molluscs',
] as const

export type AllergenId = (typeof ALLERGEN_IDS)[number]

export function isAllergenId(value: unknown): value is AllergenId {
  switch (value) {
    case 'gluten':
    case 'crustaceans':
    case 'eggs':
    case 'fish':
    case 'peanuts':
    case 'soy':
    case 'milk':
    case 'nuts':
    case 'celery':
    case 'mustard':
    case 'sesame':
    case 'sulphites':
    case 'lupin':
    case 'molluscs':
      return true
    default:
      return false
  }
}

export function parseAllergens(value: unknown): AllergenId[] {
  if (!Array.isArray(value)) {
    return []
  }
  const selected = new Set(value.filter(isAllergenId))
  return ALLERGEN_IDS.filter((id) => selected.has(id))
}

export function toggleAllergen(
  current: AllergenId[],
  id: AllergenId,
  on: boolean,
): AllergenId[] {
  if (on) {
    if (current.includes(id)) {
      return current
    }
    return ALLERGEN_IDS.filter((item) => item === id || current.includes(item))
  }
  return current.filter((item) => item !== id)
}
