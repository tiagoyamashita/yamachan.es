import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { LOCALES } from '../src/i18n/locales.ts'
import {
  catalogCopy,
  parseStoredMenuItem,
  type StoredMenuItem,
} from '../src/menu.ts'
import {
  adminSupabaseKey,
  adminSupabaseUrl,
  adminWriteSecret,
} from './adminEnv.ts'
import {
  GloballyBookedError,
  hideRestaurantMenuItem,
  upsertRestaurantMenuItem,
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
