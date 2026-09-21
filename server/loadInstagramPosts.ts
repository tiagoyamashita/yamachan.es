import { getStoredCarouselPhotos } from './adminInstagram.ts'

export type InstagramPost = {
  id: string
  number: number
  photoUrl: string
}

const POST_COUNT = 5

export async function loadInstagramPosts(): Promise<InstagramPost[]> {
  const stored = (await getStoredCarouselPhotos()).filter((url) => url.trim())
  return stored.slice(0, POST_COUNT).map((photoUrl, index) => ({
    id: `carousel-photo-${String(index + 1)}`,
    number: index + 1,
    photoUrl,
  }))
}
