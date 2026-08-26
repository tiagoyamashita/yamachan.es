import { loadInstagramPermalinkPreview } from '../../server/instagramPreview.ts'

export async function GET(request: Request) {
  const permalink = new URL(request.url).searchParams.get('url')
  if (!permalink) {
    return Response.json({ error: 'Missing url' }, { status: 400 })
  }

  try {
    const preview = await loadInstagramPermalinkPreview(permalink)
    if (!preview) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }
    return Response.json(preview)
  } catch {
    return Response.json({ error: 'Upstream error' }, { status: 502 })
  }
}
