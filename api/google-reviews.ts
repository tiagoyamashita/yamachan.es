import { loadGoogleReviews } from '../server/loadGoogleReviews.ts'

export async function GET() {
  const reviews = await loadGoogleReviews(
    process.env.GOOGLE_PLACES_API_KEY,
    // process.env.GOOGLE_PLACE_ID,
  )
  return Response.json({ reviews })
}
