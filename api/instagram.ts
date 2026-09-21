import { loadInstagramPosts } from '../server/loadInstagramPosts.ts'

export async function GET() {
  const posts = await loadInstagramPosts()
  return Response.json({ posts })
}
