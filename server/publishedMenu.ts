import { createClient } from '@supabase/supabase-js'
import {
  fallbackMenuItems,
  parseStoredMenuItem,
  type StoredMenuItem,
} from '../src/menu.ts'

export async function listPublishedMenu(): Promise<StoredMenuItem[]> {
  const url =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ''
  if (!url || !key) {
    return fallbackMenuItems()
  }

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const { data, error } = await supabase
    .from('yamachan_menu_items')
    .select(
      'id, slug, category_id, name_es, name_en, name_ja, blurb_es, blurb_en, image_url, vegetarian, sort_order, published, allergens, price_cents',
    )
    .eq('published', true)
    .order('sort_order', { ascending: true })

  if (error || !data || data.length === 0) {
    return fallbackMenuItems()
  }
  const parsed = data.flatMap((row) => {
    const item = parseStoredMenuItem(row)
    return item ? [item] : []
  })
  return parsed.length > 0 ? parsed : fallbackMenuItems()
}
