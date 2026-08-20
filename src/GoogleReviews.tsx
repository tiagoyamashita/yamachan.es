import { useEffect, useState } from 'react'
import { restaurant } from './content.ts'

export type GoogleReview = {
  id: string
  author: string
  quote: string
  stars: number
  photoUrl: string
  mapsUrl?: string
}

type FeedResponse = {
  reviews: GoogleReview[]
}

const STAR_GLYPHS = '★★★★★'
const SKELETON_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5'] as const

function StarRating({ value, max }: { value: number; max: number }) {
  const percent = Math.max(0, Math.min(value / max, 1)) * 100
  return (
    <span className="star-rating" aria-hidden="true">
      <span className="star-rating-bg">{STAR_GLYPHS}</span>
      <span className="star-rating-fill" style={{ width: `${percent}%` }}>
        {STAR_GLYPHS}
      </span>
    </span>
  )
}

function withPhotos(reviews: GoogleReview[]): GoogleReview[] {
  return reviews.filter((review) => Boolean(review.photoUrl))
}

export function GoogleReviews({
  outOf,
  openLabel,
}: {
  outOf: string
  openLabel: string
}) {
  const [reviews, setReviews] = useState<GoogleReview[] | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch('/api/google-reviews')
        if (!response.ok) {
          if (!cancelled) setReviews([])
          return
        }
        const data = (await response.json()) as FeedResponse
        if (!cancelled) setReviews(withPhotos(data.reviews))
      } catch {
        if (!cancelled) setReviews([])
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (reviews === null) {
    return (
      <ul className="review-grid" aria-busy="true">
        {SKELETON_KEYS.map((key) => (
          <li key={key} className="review-card-skeleton" />
        ))}
      </ul>
    )
  }

  if (reviews.length === 0) {
    return null
  }

  return (
    <ul className="review-grid">
      {reviews.map((review) => {
        const href = review.mapsUrl ?? restaurant.googleReviewsUrl
        return (
          <li key={review.id}>
            <a
              className="review-card"
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={`${review.author}: ${review.stars} ${outOf}. ${openLabel}`}
            >
              <img
                className="review-photo"
                src={review.photoUrl}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <blockquote>
                <p className="review-stars-row">
                  <StarRating
                    value={review.stars}
                    max={restaurant.googleMaxStars}
                  />
                  <span>
                    {review.stars} {outOf}
                  </span>
                </p>
                <p className="review-quote">{review.quote}</p>
                <footer>
                  — {review.author}
                  <cite>Google</cite>
                </footer>
              </blockquote>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
