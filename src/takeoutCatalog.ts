export type TakeoutCatalogItem = {
  slug: string
  maxQty: number
}

export type TakeoutCatalog = {
  enabled: boolean
  /** `null` means legacy: all published dishes are offered. */
  items: TakeoutCatalogItem[] | null
}

export const DEFAULT_TAKEOUT_CATALOG: TakeoutCatalog = {
  enabled: true,
  items: null,
}

const MAX_SELLABLE = 999

export function parseTakeoutCatalog(value: unknown): TakeoutCatalog {
  if (typeof value === 'string') {
    try {
      return parseTakeoutCatalog(JSON.parse(value) as unknown)
    } catch {
      return { ...DEFAULT_TAKEOUT_CATALOG }
    }
  }
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_TAKEOUT_CATALOG }
  }
  const row = value as Record<string, unknown>
  const enabled = typeof row.enabled === 'boolean' ? row.enabled : true
  if (!('items' in row) || row.items === null || row.items === undefined) {
    return { enabled, items: null }
  }
  if (!Array.isArray(row.items)) {
    return { enabled, items: [] }
  }
  const items: TakeoutCatalogItem[] = []
  for (const entry of row.items) {
    if (!entry || typeof entry !== 'object') {
      continue
    }
    const item = entry as Record<string, unknown>
    const slug = typeof item.slug === 'string' ? item.slug.trim() : ''
    const maxQty = Number(item.maxQty)
    if (!slug || !Number.isFinite(maxQty) || maxQty < 1) {
      continue
    }
    items.push({
      slug,
      maxQty: Math.min(MAX_SELLABLE, Math.floor(maxQty)),
    })
  }
  return { enabled, items }
}

export function serializeTakeoutCatalog(catalog: TakeoutCatalog): string {
  return JSON.stringify({
    enabled: catalog.enabled,
    items: catalog.items,
  })
}

/** Max units a customer may order for this slug, or `0` if not offered. */
export function takeoutOfferMaxQty(
  catalog: TakeoutCatalog,
  slug: string,
): number {
  if (!catalog.enabled) {
    return 0
  }
  if (catalog.items === null) {
    return MAX_SELLABLE
  }
  const match = catalog.items.find((item) => item.slug === slug)
  return match && match.maxQty > 0 ? match.maxQty : 0
}
