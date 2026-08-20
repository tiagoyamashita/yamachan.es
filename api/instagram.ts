import { loadInstagramPosts } from '../server/loadInstagramPosts.ts'

export async function GET() {
  const posts = await loadInstagramPosts(
    process.env.INSTAGRAM_ACCESS_TOKEN,
    process.env.INSTAGRAM_POST_URLS,
  )
  return Response.json({ posts })
}
