import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { adminSupabaseKey, adminSupabaseUrl, adminWriteSecret } from './adminEnv.ts'

export const REVIEW_SLOTS = 5

const REVIEW_PHOTO_BUCKET = 'yamachan-reviews'

const PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export type StoredGoogleReview = {
  author: string
  quote: string
  stars: number
  mapsUrl: string
  photoUrl: string
}

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

function emptyReview(): StoredGoogleReview {
  return { author: '', quote: '', stars: 5, mapsUrl: '', photoUrl: '' }
}

function clampStars(value: unknown): number {
  const stars = Number(value)
  if (!Number.isFinite(stars)) {
    return 5
  }
  return Math.min(5, Math.max(1, Math.round(stars)))
}

export function parseStoredReviews(
  raw: string | undefined | null,
): StoredGoogleReview[] {
  const slots = Array.from({ length: REVIEW_SLOTS }, emptyReview)
  if (!raw?.trim()) {
    return slots
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return slots
    }
    for (let index = 0; index < REVIEW_SLOTS; index += 1) {
      const entry = parsed[index]
      if (!entry || typeof entry !== 'object') {
        continue
      }
      const row = entry as Record<string, unknown>
      slots[index] = {
        author: typeof row.author === 'string' ? row.author.trim() : '',
        quote: typeof row.quote === 'string' ? row.quote.trim() : '',
        mapsUrl: typeof row.mapsUrl === 'string' ? row.mapsUrl.trim() : '',
        photoUrl: typeof row.photoUrl === 'string' ? row.photoUrl.trim() : '',
        stars: clampStars(row.stars),
      }
    }
  } catch {
    // ignore malformed stored value, fall back to empty slots
  }
  return slots
}

export function serializeReviews(inputs: StoredGoogleReview[]): string {
  const slots = Array.from({ length: REVIEW_SLOTS }, (_, index) => {
    const entry = inputs[index]
    if (!entry || !entry.author.trim() || !entry.quote.trim()) {
      return emptyReview()
    }
    return {
      author: entry.author.trim(),
      quote: entry.quote.trim(),
      mapsUrl: entry.mapsUrl.trim(),
      photoUrl: entry.photoUrl.trim(),
      stars: clampStars(entry.stars),
    }
  })
  return JSON.stringify(slots)
}

/** Only slots with both an author and a quote count as a real review. */
export function publishedGoogleReviews(
  reviews: StoredGoogleReview[],
): StoredGoogleReview[] {
  return reviews.filter((review) => review.author.trim() && review.quote.trim())
}

export async function getStoredGoogleReviews(): Promise<StoredGoogleReview[]> {
  const supabase = getSupabase()
  if (!supabase) {
    return Array.from({ length: REVIEW_SLOTS }, emptyReview)
  }
  const { data, error } = await supabase.rpc('yamachan_get_reviews')
  if (error || typeof data !== 'string') {
    return Array.from({ length: REVIEW_SLOTS }, emptyReview)
  }
  return parseStoredReviews(data)
}

export async function setStoredGoogleReviews(
  inputs: StoredGoogleReview[],
): Promise<StoredGoogleReview[]> {
  const secret = adminWriteSecret()
  const supabase = getSupabase()
  if (!secret || !supabase) {
    throw new Error('missing-admin-config')
  }
  const payload = serializeReviews(inputs)
  const { data, error } = await supabase.rpc('yamachan_admin_set_reviews', {
    p_secret: secret,
    p_reviews: payload,
  })
  if (error) {
    throw new Error(error.message)
  }
  return parseStoredReviews(typeof data === 'string' ? data : payload)
}

export async function uploadReviewPhoto(file: File): Promise<{ url: string }> {
  const supabase = getSupabase()
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
    .from(REVIEW_PHOTO_BUCKET)
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    })
  if (error) {
    throw new Error(error.message)
  }
  const { data } = supabase.storage.from(REVIEW_PHOTO_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl }
}
