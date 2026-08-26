import { fetchInstagramMedia } from '../../server/instagramEmbed.ts'

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get('url')
  if (!url) {
    return new Response('Missing url', { status: 400 })
  }

  const media = await fetchInstagramMedia(url, request)
  if (!media) {
    return new Response('Not found', { status: 404 })
  }
  return media
}
