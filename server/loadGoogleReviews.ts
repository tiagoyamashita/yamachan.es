export type GoogleReview = {
  id: string
  author: string
  quote: string
  stars: number
  photoUrl?: string
  mapsUrl?: string
}

type PlacesSearchResponse = {
  places?: { id?: string }[]
}

type PlaceAuthor = {
  displayName?: string
  uri?: string
}

type PlaceReview = {
  name?: string
  rating?: number
  text?: { text?: string }
  originalText?: { text?: string }
  authorAttribution?: PlaceAuthor
  googleMapsUri?: string
}

type PlacePhoto = {
  name?: string
  authorAttributions?: PlaceAuthor[]
}

type PlaceDetails = {
  rating?: number
  userRatingCount?: number
  reviews?: PlaceReview[]
  photos?: PlacePhoto[]
}

type PhotoMedia = {
  photoUri?: string
}

const SEARCH_QUERY = 'Yama-Chan C/ Pardo Gimeno 10 Alicante'
const MAX_REVIEWS = 5

function authorKey(name: string | undefined): string {
  return (name ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function authorsMatch(reviewAuthor: string, photoAuthor: string): boolean {
  if (!reviewAuthor || !photoAuthor) {
    return false
  }
  return (
    reviewAuthor === photoAuthor ||
    reviewAuthor.includes(photoAuthor) ||
    photoAuthor.includes(reviewAuthor)
  )
}

async function searchPlaceId(apiKey: string): Promise<string | undefined> {
  const response = await fetch(
    'https://places.googleapis.com/v1/places:searchText',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id',
      },
      body: JSON.stringify({
        textQuery: SEARCH_QUERY,
        languageCode: 'es',
        regionCode: 'ES',
        locationBias: {
          circle: {
            center: { latitude: 38.3418399, longitude: -0.4968258 },
            radius: 250,
          },
        },
      }),
    },
  )
  if (!response.ok) {
    return undefined
  }
  const payload = (await response.json()) as PlacesSearchResponse
  return payload.places?.[0]?.id
}

async function loadPlace(
  apiKey: string,
  placeId: string,
): Promise<PlaceDetails | undefined> {
  const query = new URLSearchParams({ languageCode: 'es' })
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}?${query.toString()}`,
    {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'rating,userRatingCount,reviews,photos,reviews.rating,reviews.text,reviews.originalText,reviews.authorAttribution,reviews.googleMapsUri,reviews.name,photos.name,photos.authorAttributions',
      },
    },
  )
  if (!response.ok) {
    return undefined
  }
  return (await response.json()) as PlaceDetails
}

async function loadPhotoUri(
  apiKey: string,
  photoName: string,
): Promise<string | undefined> {
  const query = new URLSearchParams({
    maxWidthPx: '900',
    skipHttpRedirect: 'true',
  })
  const response = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?${query.toString()}`,
    { headers: { 'X-Goog-Api-Key': apiKey } },
  )
  if (!response.ok) {
    return undefined
  }
  const payload = (await response.json()) as PhotoMedia
  return payload.photoUri
}

export async function loadGoogleReviews(
  apiKey: string | undefined,
  placeIdOverride?: string,
): Promise<GoogleReview[]> {
  if (!apiKey) {
    return []
  }

  const placeId = placeIdOverride || (await searchPlaceId(apiKey))
  if (!placeId) {
    return []
  }

  const place = await loadPlace(apiKey, placeId)
  if (!place) {
    return []
  }

  const photos = (place.photos ?? []).slice(0, 10)
  const photoByAuthor = new Map<string, string>()
  const photoUris: string[] = []

  await Promise.all(
    photos.map(async (photo) => {
      if (!photo.name) {
        return
      }
      const uri = await loadPhotoUri(apiKey, photo.name)
      if (!uri) {
        return
      }
      if (!photoUris.includes(uri)) {
        photoUris.push(uri)
      }
      for (const author of photo.authorAttributions ?? []) {
        const key = authorKey(author.displayName)
        if (key && !photoByAuthor.has(key)) {
          photoByAuthor.set(key, uri)
        }
      }
    }),
  )

  const usedPhotos = new Set<string>()
  const pending: GoogleReview[] = []
  for (const review of place.reviews ?? []) {
    const author = review.authorAttribution?.displayName?.trim()
    const quote = (
      review.originalText?.text ??
      review.text?.text ??
      ''
    ).trim()
    const stars = review.rating
    if (!author || !quote || !stars) {
      continue
    }

    const key = authorKey(author)
    let photoUrl: string | undefined
    for (const [photoAuthor, uri] of photoByAuthor) {
      if (authorsMatch(key, photoAuthor) && !usedPhotos.has(uri)) {
        photoUrl = uri
        usedPhotos.add(uri)
        break
      }
    }

    pending.push({
      id: review.name ?? `${key}-${String(pending.length)}`,
      author,
      quote,
      stars,
      photoUrl,
      mapsUrl: review.googleMapsUri,
    })
  }

  const leftover = photoUris.filter((uri) => !usedPhotos.has(uri))
  for (const review of pending) {
    if (review.photoUrl || leftover.length === 0) {
      continue
    }
    const uri = leftover.shift()
    if (!uri) {
      continue
    }
    review.photoUrl = uri
    usedPhotos.add(uri)
  }

  const reviews: GoogleReview[] = []
  for (const review of pending) {
    if (!review.photoUrl) {
      continue
    }
    reviews.push(review)
    if (reviews.length >= MAX_REVIEWS) {
      break
    }
  }

  return reviews
}
