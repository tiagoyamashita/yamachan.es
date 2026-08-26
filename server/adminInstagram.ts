import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  adminSupabaseKey,
  adminSupabaseUrl,
  adminWriteSecret,
} from './adminEnv.ts'

export const INSTAGRAM_POST_SLOTS = 5

const PERMALINK_RE =
  /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/i

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

/** Normalize a URL or pasted Instagram embed HTML into a clean permalink. */
export function extractInstagramPermalink(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  const fromAttr = trimmed.match(
    /data-instgrm-permalink=(["'])(.*?)\1/i,
  )
  const candidate = fromAttr?.[2]
    ? fromAttr[2].replaceAll('&amp;', '&')
    : trimmed

  const match = candidate.match(PERMALINK_RE)
  if (!match) {
    return null
  }

  return `https://www.instagram.com/${match[1].toLowerCase()}/${match[2]}/`
}

/** Parse stored JSON/text into up to 5 slot strings (empties preserved for admin). */
export function parseInstagramUrlSlots(
  raw: string | undefined | null,
): string[] {
  const slots = Array.from({ length: INSTAGRAM_POST_SLOTS }, () => '')
  if (!raw?.trim()) {
    return slots
  }

  if (raw.trim().startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        for (let index = 0; index < INSTAGRAM_POST_SLOTS; index += 1) {
          const entry = parsed[index]
          if (typeof entry !== 'string' || !entry.trim()) {
            slots[index] = ''
            continue
          }
          slots[index] = extractInstagramPermalink(entry) ?? ''
        }
        return slots
      }
    } catch {
      // fall through
    }
  }

  const filled = raw
    .split(/[\n,]+/)
    .map((entry) => extractInstagramPermalink(entry))
    .filter((entry): entry is string => Boolean(entry))
    .slice(0, INSTAGRAM_POST_SLOTS)

  for (let index = 0; index < filled.length; index += 1) {
    slots[index] = filled[index]
  }
  return slots
}

export function parseInstagramUrlList(raw: string | undefined | null): string[] {
  return parseInstagramUrlSlots(raw).filter(Boolean)
}

export function serializeInstagramUrls(inputs: string[]): string {
  const slots = Array.from({ length: INSTAGRAM_POST_SLOTS }, (_, index) => {
    const raw = inputs[index] ?? ''
    if (!raw.trim()) {
      return ''
    }
    return extractInstagramPermalink(raw) ?? ''
  })
  return JSON.stringify(slots)
}

export function padInstagramSlots(urls: string[]): string[] {
  const slots = Array.from({ length: INSTAGRAM_POST_SLOTS }, (_, index) => {
    const value = urls[index]
    return typeof value === 'string' ? value : ''
  })
  return slots
}

export async function getStoredInstagramPostUrls(): Promise<string[]> {
  const supabase = getSupabase()
  if (!supabase) {
    return []
  }
  const { data, error } = await supabase.rpc('yamachan_get_instagram_post_urls')
  if (error || typeof data !== 'string') {
    return []
  }
  return parseInstagramUrlSlots(data)
}

export async function setStoredInstagramPostUrls(
  inputs: string[],
): Promise<string[]> {
  const secret = adminWriteSecret()
  const supabase = getSupabase()
  if (!secret || !supabase) {
    throw new Error('missing-admin-config')
  }

  const normalized = Array.from({ length: INSTAGRAM_POST_SLOTS }, (_, index) => {
    const raw = inputs[index] ?? ''
    if (!raw.trim()) {
      return ''
    }
    return extractInstagramPermalink(raw) ?? ''
  })

  for (let index = 0; index < INSTAGRAM_POST_SLOTS; index += 1) {
    const raw = inputs[index] ?? ''
    if (raw.trim() && !normalized[index]) {
      throw new Error(`invalid-url-${String(index + 1)}`)
    }
  }

  const payload = serializeInstagramUrls(normalized)
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
  return parseInstagramUrlSlots(typeof data === 'string' ? data : payload)
}
