import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  adminSupabaseKey,
  adminSupabaseUrl,
  adminWriteSecret,
} from './adminEnv.ts'

export const CAROUSEL_PHOTO_SLOTS = 5

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

/** Parse stored JSON into up to 5 slot strings (empties preserved for admin). */
export function parseCarouselPhotoSlots(
  raw: string | undefined | null,
): string[] {
  const slots = Array.from({ length: CAROUSEL_PHOTO_SLOTS }, () => '')
  if (!raw?.trim()) {
    return slots
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      for (let index = 0; index < CAROUSEL_PHOTO_SLOTS; index += 1) {
        const entry = parsed[index]
        slots[index] = typeof entry === 'string' ? entry.trim() : ''
      }
    }
  } catch {
    // fall through with empty slots
  }
  return slots
}

export function serializeCarouselPhotos(inputs: string[]): string {
  const slots = Array.from({ length: CAROUSEL_PHOTO_SLOTS }, (_, index) =>
    (inputs[index] ?? '').trim(),
  )
  return JSON.stringify(slots)
}

export function padCarouselPhotoSlots(urls: string[]): string[] {
  return Array.from({ length: CAROUSEL_PHOTO_SLOTS }, (_, index) => {
    const value = urls[index]
    return typeof value === 'string' ? value : ''
  })
}

export async function getStoredCarouselPhotos(): Promise<string[]> {
  const supabase = getSupabase()
  if (!supabase) {
    return []
  }
  const { data, error } = await supabase.rpc('yamachan_get_instagram_post_urls')
  if (error || typeof data !== 'string') {
    return []
  }
  return parseCarouselPhotoSlots(data)
}

export async function setStoredCarouselPhotos(
  inputs: string[],
): Promise<string[]> {
  const secret = adminWriteSecret()
  const supabase = getSupabase()
  if (!secret || !supabase) {
    throw new Error('missing-admin-config')
  }

  const payload = serializeCarouselPhotos(inputs)
  const { data, error } = await supabase.rpc(
    'yamachan_admin_set_instagram_post_urls',
    {
      p_secret: secret,
      p_urls: payload,
    },
  )
  if (error) {
    throw new Error(error.message)
  }
  return parseCarouselPhotoSlots(typeof data === 'string' ? data : payload)
}
