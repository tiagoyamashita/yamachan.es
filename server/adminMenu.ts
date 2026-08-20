import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { StoredMenuItem } from '../src/menu.ts'
import { isMenuCategoryId } from '../src/menu.ts'

const MENU_BUCKET = 'yamachan-menu'

function writeSecret(): string {
  return process.env.ADMIN_WRITE_SECRET || ''
}

function getAdminSupabase(): SupabaseClient | null {
  const url =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ''
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

function isStoredMenuItem(value: unknown): value is StoredMenuItem {
  if (!value || typeof value !== 'object') {
    return false
  }
  const row = value as Record<string, unknown>
  return (
    typeof row.id === 'string' &&
    typeof row.slug === 'string' &&
    isMenuCategoryId(row.category_id) &&
    typeof row.name_es === 'string' &&
    typeof row.name_en === 'string' &&
    typeof row.name_ja === 'string' &&
    typeof row.blurb_es === 'string' &&
    typeof row.blurb_en === 'string' &&
    typeof row.image_url === 'string' &&
    typeof row.vegetarian === 'boolean' &&
    typeof row.sort_order === 'number' &&
    typeof row.published === 'boolean'
  )
}

export async function listAdminMenu(): Promise<StoredMenuItem[]> {
  const secret = writeSecret()
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
  return data.filter(isStoredMenuItem)
}

export async function upsertAdminMenuItem(
  item: StoredMenuItem,
): Promise<StoredMenuItem> {
  const secret = writeSecret()
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
  if (!isStoredMenuItem(data)) {
    throw new Error('invalid-menu-item')
  }
  return data
}

export async function deleteAdminMenuItem(id: string): Promise<void> {
  const secret = writeSecret()
  const supabase = getAdminSupabase()
  if (!secret || !supabase) {
    throw new Error('missing-admin-config')
  }
  const { error } = await supabase.rpc('yamachan_admin_delete_menu_item', {
    p_secret: secret,
    p_id: id,
  })
  if (error) {
    throw new Error(error.message)
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
