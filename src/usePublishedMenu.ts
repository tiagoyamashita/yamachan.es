import { useEffect, useState } from 'react'
import { getSupabase } from './supabase.ts'
import {
  fallbackMenuItems,
  parseStoredMenuItem,
  type StoredMenuItem,
} from './menu.ts'

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
          'id, slug, category_id, name_es, name_en, name_ja, blurb_es, blurb_en, image_url, vegetarian, sort_order, published, allergens, price_cents',
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
      const parsed = data.flatMap((row) => {
        const item = parseStoredMenuItem(row)
        return item ? [item] : []
      })
      setItems(parsed.length > 0 ? parsed : fallbackMenuItems())
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [client])

  return items
}
