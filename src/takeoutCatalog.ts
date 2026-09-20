export type TakeoutCatalogItem = {
  slug: string
  maxQty: number
}

export type TakeoutTemplate = {
  id: string
  name: string
  items: TakeoutCatalogItem[]
}

export type TakeoutCatalog = {
  enabled: boolean
  /** `null` means legacy: all published dishes are offered. */
  items: TakeoutCatalogItem[] | null
  templates: TakeoutTemplate[]
  activeTemplateId: string | null
}

function cloneDefaultCatalog(enabled = true): TakeoutCatalog {
  return {
    enabled,
    items: null,
    templates: [],
    activeTemplateId: null,
  }
}

export const DEFAULT_TAKEOUT_CATALOG: TakeoutCatalog = cloneDefaultCatalog()

const MAX_SELLABLE = 999
const MAX_TEMPLATE_NAME = 80

function parseTakeoutItems(value: unknown): TakeoutCatalogItem[] {
  if (!Array.isArray(value)) {
    return []
  }
  const items: TakeoutCatalogItem[] = []
  const used = new Set<string>()
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue
    }
    const item = entry as Record<string, unknown>
    const slug = typeof item.slug === 'string' ? item.slug.trim() : ''
    const maxQty = Number(item.maxQty)
    if (!slug || used.has(slug) || !Number.isFinite(maxQty) || maxQty < 1) {
      continue
    }
    used.add(slug)
    items.push({
      slug,
      maxQty: Math.min(MAX_SELLABLE, Math.floor(maxQty)),
    })
  }
  return items.sort((left, right) => left.slug.localeCompare(right.slug))
}

function newTemplateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createTakeoutTemplateId(): string {
  return newTemplateId()
}

function parseTakeoutTemplates(value: unknown): TakeoutTemplate[] {
  if (!Array.isArray(value)) {
    return []
  }
  const templates: TakeoutTemplate[] = []
  const usedIds = new Set<string>()
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue
    }
    const row = entry as Record<string, unknown>
    const name =
      typeof row.name === 'string' ? row.name.trim().slice(0, MAX_TEMPLATE_NAME) : ''
    const items = parseTakeoutItems(row.items)
    if (!name || items.length === 0) {
      continue
    }
    let id = typeof row.id === 'string' ? row.id.trim() : ''
    if (!id || usedIds.has(id)) {
      id = newTemplateId()
    }
    usedIds.add(id)
    templates.push({ id, name, items })
  }
  return templates.sort((left, right) => left.name.localeCompare(right.name))
}

export function takeoutOffersMatch(
  left: TakeoutCatalogItem[],
  right: TakeoutCatalogItem[],
): boolean {
  if (left.length !== right.length) {
    return false
  }
  return left.every(
    (item, index) =>
      item.slug === right[index]?.slug && item.maxQty === right[index]?.maxQty,
  )
}

export function activeTemplateIdForOffers(
  templates: TakeoutTemplate[],
  offers: TakeoutCatalogItem[],
): string | null {
  const match = templates.find((template) =>
    takeoutOffersMatch(template.items, offers),
  )
  return match?.id ?? null
}

export function parseTakeoutCatalog(value: unknown): TakeoutCatalog {
  if (typeof value === 'string') {
    try {
      return parseTakeoutCatalog(JSON.parse(value) as unknown)
    } catch {
      return cloneDefaultCatalog()
    }
  }
  if (!value || typeof value !== 'object') {
    return cloneDefaultCatalog()
  }
  const row = value as Record<string, unknown>
  const enabled = typeof row.enabled === 'boolean' ? row.enabled : true
  const templates = parseTakeoutTemplates(row.templates)
  const items =
    !('items' in row) || row.items === null || row.items === undefined
      ? null
      : parseTakeoutItems(row.items)
  const requestedId =
    typeof row.activeTemplateId === 'string' ? row.activeTemplateId.trim() : ''
  const activeTemplateId = templates.some((template) => template.id === requestedId)
    ? requestedId
    : items
      ? activeTemplateIdForOffers(templates, items)
      : null
  return { enabled, items, templates, activeTemplateId }
}

export function serializeTakeoutCatalog(catalog: TakeoutCatalog): string {
  return JSON.stringify({
    enabled: catalog.enabled,
    items: catalog.items,
    templates: catalog.templates,
    activeTemplateId: catalog.activeTemplateId,
  })
}

export function publicTakeoutCatalog(catalog: TakeoutCatalog): TakeoutCatalog {
  return {
    enabled: catalog.enabled,
    items: catalog.items,
    templates: [],
    activeTemplateId: null,
  }
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
