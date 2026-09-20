import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { LOCALES } from '../src/i18n/locales.ts'
import {
  catalogCopy,
  categoryIdForDishName,
  categoryIdFromLabel,
  dishNamesMatch,
  parseStoredMenuItem,
  slugFromName,
  type StoredMenuItem,
} from '../src/menu.ts'
import {
  adminSupabaseKey,
  adminSupabaseUrl,
  adminWriteSecret,
} from './adminEnv.ts'
import {
  GloballyBookedError,
  deleteRestaurantMenuItem,
  hideRestaurantMenuItem,
  loadGloballyBookedMenu,
  upsertRestaurantMenuItem,
  type GloballyBookedMenuItem,
} from './globallyBooked.ts'

const MENU_BUCKET = 'yamachan-menu'

function menuAliases(item: StoredMenuItem): string[] {
  const names = [item.name_es, item.name_en, item.name_ja, item.slug]
  for (const locale of LOCALES) {
    const catalog = catalogCopy(item.slug, locale)
    if (catalog?.name) {
      names.push(catalog.name)
    }
  }
  return names.filter((name) => name.trim().length > 0)
}

function publicImageUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) {
    return null
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  const origin = (
    process.env.PUBLIC_SITE_URL || 'https://yamachan.es'
  ).replace(/\/+$/, '')
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`
}

function toGloballyBookedMenuInput(item: StoredMenuItem) {
  return {
    name: item.name_es.trim() || item.name_en.trim() || item.slug,
    aliases: menuAliases(item),
    description: item.blurb_es.trim() || item.blurb_en.trim() || null,
    price_cents: item.price_cents > 0 ? item.price_cents : null,
    image_url: publicImageUrl(item.image_url),
    is_available: item.published,
    sort_order: item.sort_order,
    categoryHint: item.slug === 'sashimi' ? 'sashimi' : item.category_id,
  }
}

async function hideMenuItemInGloballyBooked(item: StoredMenuItem): Promise<void> {
  try {
    await hideRestaurantMenuItem({
      name: item.name_es.trim() || item.name_en.trim() || item.slug,
      aliases: menuAliases(item),
    })
  } catch (error) {
    if (error instanceof GloballyBookedError && error.message === 'not-configured') {
      return
    }
    throw error
  }
}

function getAdminSupabase(): SupabaseClient | null {
  const url = adminSupabaseUrl()
  const key = adminSupabaseKey()
  if (!url || !key) {
    return null
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

export async function listAdminMenu(): Promise<StoredMenuItem[]> {
  const secret = adminWriteSecret()
  const supabase = getAdminSupabase()
  if (!secret || !supabase) {
    throw new Error('missing-admin-config')
  }
  const { data, error } = await supabase.rpc('yamachan_admin_list_menu', {
    p_secret: secret,
  })
  if (error) {
    throw new Error(error.message)
  }
  if (!Array.isArray(data)) {
    return []
  }
  return data.flatMap((row) => {
    const item = parseStoredMenuItem(row)
    return item ? [item] : []
  })
}

export type AdminMenuSaveResult = {
  item: StoredMenuItem
  inventoryName: string | null
  inventoryPriceCents: number | null
  inventoryError: boolean
}

export async function upsertAdminMenuItem(
  item: StoredMenuItem,
  options?: { syncInventory?: boolean },
): Promise<AdminMenuSaveResult> {
  const secret = adminWriteSecret()
  const supabase = getAdminSupabase()
  if (!secret || !supabase) {
    throw new Error('missing-admin-config')
  }
  const { data, error } = await supabase.rpc(
    'yamachan_admin_upsert_menu_item',
    {
      p_secret: secret,
      p_item: item,
    },
  )
  if (error) {
    throw new Error(error.message)
  }
  const saved = parseStoredMenuItem(data)
  if (!saved) {
    throw new Error('invalid-menu-item')
  }
  if (options?.syncInventory === false) {
    return {
      item: saved,
      inventoryName: null,
      inventoryPriceCents: null,
      inventoryError: false,
    }
  }
  try {
    const inventory = await upsertRestaurantMenuItem(
      toGloballyBookedMenuInput(saved),
    )
    return {
      item: saved,
      inventoryName: inventory.name,
      inventoryPriceCents: inventory.price_cents,
      inventoryError: false,
    }
  } catch (syncError) {
    if (
      syncError instanceof GloballyBookedError &&
      syncError.message === 'not-configured'
    ) {
      return {
        item: saved,
        inventoryName: null,
        inventoryPriceCents: null,
        inventoryError: false,
      }
    }
    return {
      item: saved,
      inventoryName: null,
      inventoryPriceCents: null,
      inventoryError: true,
    }
  }
}

export async function deleteAdminMenuItem(id: string): Promise<void> {
  const secret = adminWriteSecret()
  const supabase = getAdminSupabase()
  if (!secret || !supabase) {
    throw new Error('missing-admin-config')
  }
  const current = (await listAdminMenu()).find((item) => item.id === id)
  const { error } = await supabase.rpc('yamachan_admin_delete_menu_item', {
    p_secret: secret,
    p_id: id,
  })
  if (error) {
    throw new Error(error.message)
  }
  if (current) {
    await hideMenuItemInGloballyBooked(current)
  }
}

const PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export async function uploadMenuPhoto(
  file: File,
): Promise<{ url: string }> {
  const supabase = getAdminSupabase()
  if (!supabase) {
    throw new Error('missing-admin-config')
  }
  const ext = PHOTO_TYPES[file.type]
  if (!ext) {
    throw new Error('unsupported-type')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('too-large')
  }
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from(MENU_BUCKET)
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    })
  if (error) {
    throw new Error(error.message)
  }
  const { data } = supabase.storage.from(MENU_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl }
}

function findMatchingSiteItem(
  items: StoredMenuItem[],
  inventoryName: string,
  usedIds: Set<string>,
): StoredMenuItem | null {
  for (const item of items) {
    if (usedIds.has(item.id)) {
      continue
    }
    if (menuAliases(item).some((alias) => dishNamesMatch(alias, inventoryName))) {
      return item
    }
  }
  return null
}

function uniqueSlug(name: string, used: Set<string>): string {
  const base = slugFromName(name).toLowerCase() || 'plato'
  let slug = base
  let n = 2
  while (used.has(slug)) {
    slug = `${base}-${n}`
    n += 1
  }
  used.add(slug)
  return slug
}

function categoryForInventoryItem(
  inventory: GloballyBookedMenuItem,
  fallback: StoredMenuItem['category_id'],
): StoredMenuItem['category_id'] {
  return (
    (inventory.category ? categoryIdFromLabel(inventory.category) : null) ??
    categoryIdForDishName(inventory.name) ??
    fallback
  )
}

function siteItemFromInventory(
  current: StoredMenuItem,
  inventory: GloballyBookedMenuItem,
): StoredMenuItem {
  return {
    ...current,
    name_es: inventory.name,
    blurb_es: inventory.description ?? current.blurb_es,
    image_url: current.image_url.trim() || inventory.image_url || '',
    category_id: categoryForInventoryItem(inventory, current.category_id),
    sort_order: inventory.sort_order,
    published: inventory.is_available,
    price_cents:
      inventory.price_cents !== null ? inventory.price_cents : current.price_cents,
  }
}

function newItemFromInventory(
  inventory: GloballyBookedMenuItem,
  slug: string,
): StoredMenuItem {
  return {
    id: '',
    slug,
    category_id: categoryForInventoryItem(inventory, 'starters'),
    name_es: inventory.name,
    name_en: '',
    name_ja: '',
    blurb_es: inventory.description ?? '',
    blurb_en: '',
    image_url: inventory.image_url ?? '',
    vegetarian: false,
    sort_order: inventory.sort_order,
    published: inventory.is_available,
    allergens: [],
    price_cents: inventory.price_cents ?? 0,
  }
}

function inventoryChanged(current: StoredMenuItem, next: StoredMenuItem): boolean {
  return (
    current.name_es !== next.name_es ||
    current.blurb_es !== next.blurb_es ||
    current.image_url !== next.image_url ||
    current.category_id !== next.category_id ||
    current.sort_order !== next.sort_order ||
    current.published !== next.published ||
    current.price_cents !== next.price_cents
  )
}

export type InventoryImportResult = {
  items: StoredMenuItem[]
  updated: number
  created: number
}

export async function importInventoryFromGloballyBooked(): Promise<InventoryImportResult> {
  const [inventory, existing] = await Promise.all([
    loadGloballyBookedMenu(),
    listAdminMenu(),
  ])
  const usedIds = new Set<string>()
  const usedSlugs = new Set(
    existing.map((item) => item.slug.toLowerCase()).filter(Boolean),
  )
  let updated = 0
  let created = 0
  const sorted = inventory.slice().sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order
    }
    return left.name.localeCompare(right.name)
  })

  for (const row of sorted) {
    const match = findMatchingSiteItem(existing, row.name, usedIds)
    if (match) {
      usedIds.add(match.id)
      const next = siteItemFromInventory(match, row)
      if (!inventoryChanged(match, next)) {
        continue
      }
      await upsertAdminMenuItem(next, { syncInventory: false })
      updated += 1
      continue
    }
    await upsertAdminMenuItem(
      newItemFromInventory(row, uniqueSlug(row.name, usedSlugs)),
      { syncInventory: false },
    )
    created += 1
  }

  return {
    items: await listAdminMenu(),
    updated,
    created,
  }
}

export type InventoryExportResult = {
  cleared: number
  pushed: number
}

export async function exportInventoryToGloballyBooked(): Promise<InventoryExportResult> {
  const [existing, items] = await Promise.all([
    loadGloballyBookedMenu(),
    listAdminMenu(),
  ])

  for (const row of existing) {
    await deleteRestaurantMenuItem(row.id)
  }

  let pushed = 0
  for (const item of items) {
    if (!item.published) {
      continue
    }
    await upsertRestaurantMenuItem(toGloballyBookedMenuInput(item))
    pushed += 1
  }

  return { cleared: existing.length, pushed }
}
