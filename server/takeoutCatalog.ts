import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  parseTakeoutCatalog,
  serializeTakeoutCatalog,
  type TakeoutCatalog,
  type TakeoutCatalogItem,
} from '../src/takeoutCatalog.ts'
import {
  adminSupabaseKey,
  adminSupabaseUrl,
  adminWriteSecret,
} from './adminEnv.ts'

function getSupabase(): SupabaseClient | null {
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

export function normalizeTakeoutCatalogInput(value: unknown): TakeoutCatalog {
  const parsed = parseTakeoutCatalog(value)
  if (parsed.items === null) {
    return {
      enabled: parsed.enabled,
      items: [],
      templates: parsed.templates,
      activeTemplateId: parsed.activeTemplateId,
    }
  }
  const bySlug = new Map<string, TakeoutCatalogItem>()
  for (const item of parsed.items) {
    bySlug.set(item.slug, item)
  }
  const items = [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug))
  return {
    enabled: parsed.enabled,
    items,
    templates: parsed.templates,
    activeTemplateId: parsed.activeTemplateId,
  }
}

export async function loadTakeoutCatalog(): Promise<TakeoutCatalog> {
  const supabase = getSupabase()
  if (!supabase) {
    return parseTakeoutCatalog(null)
  }
  const { data, error } = await supabase.rpc('yamachan_get_takeout_catalog')
  if (error) {
    throw new Error(error.message)
  }
  return parseTakeoutCatalog(typeof data === 'string' ? data : null)
}

export async function saveTakeoutCatalog(
  catalog: TakeoutCatalog,
): Promise<TakeoutCatalog> {
  const secret = adminWriteSecret()
  const supabase = getSupabase()
  if (!secret || !supabase) {
    throw new Error('missing-admin-config')
  }
  const normalized = normalizeTakeoutCatalogInput(catalog)
  const { data, error } = await supabase.rpc('yamachan_admin_set_takeout_catalog', {
    p_secret: secret,
    p_catalog: serializeTakeoutCatalog(normalized),
  })
  if (error) {
    throw new Error(error.message)
  }
  return parseTakeoutCatalog(typeof data === 'string' ? data : null)
}
