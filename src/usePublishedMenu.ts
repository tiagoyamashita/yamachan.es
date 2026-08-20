import { useEffect, useState } from 'react'
import { getSupabase } from './supabase.ts'
import {
  fallbackMenuItems,
  isMenuCategoryId,
  type StoredMenuItem,
} from './menu.ts'

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

export function usePublishedMenu() {
  const client = getSupabase()
  const [items, setItems] = useState<StoredMenuItem[] | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!client) {
        setItems(fallbackMenuItems())
        return
      }

      const { data, error } = await client
        .from('yamachan_menu_items')
        .select(
          'id, slug, category_id, name_es, name_en, name_ja, blurb_es, blurb_en, image_url, vegetarian, sort_order, published',
        )
        .eq('published', true)
        .order('sort_order', { ascending: true })

      if (cancelled) {
        return
      }
      if (error || !data || data.length === 0) {
        setItems(fallbackMenuItems())
        return
      }
      const parsed = data.filter(isStoredMenuItem)
      setItems(parsed.length > 0 ? parsed : fallbackMenuItems())
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [client])

  return items
}
