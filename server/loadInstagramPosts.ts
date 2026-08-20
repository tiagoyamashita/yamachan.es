type InstagramPost = {
  id: string
  permalink: string
  mediaUrl?: string
  thumbnailUrl?: string
  mediaType: string
  caption?: string
}

type GraphMedia = {
  id: string
  permalink?: string
  media_url?: string
  thumbnail_url?: string
  media_type?: string
  caption?: string
}

type GraphResponse = {
  data?: GraphMedia[]
}

function postsFromUrls(raw: string | undefined): InstagramPost[] {
  if (!raw) {
    return []
  }

  return raw
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith('http'))
    .slice(0, 10)
    .map((permalink, index) => ({
      id: `permalink-${String(index)}`,
      permalink,
      mediaType: 'IMAGE',
    }))
}

export async function loadInstagramPosts(
  token: string | undefined,
  permalinks?: string,
): Promise<InstagramPost[]> {
  if (token) {
    const query = new URLSearchParams({
      fields:
        'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp',
      limit: '10',
      access_token: token,
    })

    const response = await fetch(
      `https://graph.instagram.com/me/media?${query.toString()}`,
    )
    if (response.ok) {
      const payload = (await response.json()) as GraphResponse
      const posts = (payload.data ?? [])
        .filter((item) => Boolean(item.permalink))
        .slice(0, 10)
        .map((item) => ({
          id: item.id,
          permalink: item.permalink ?? '',
          mediaUrl: item.media_url,
          thumbnailUrl: item.thumbnail_url,
          mediaType: item.media_type ?? 'IMAGE',
          caption: item.caption,
        }))
      if (posts.length > 0) {
        return posts
      }
    }
  }

  return postsFromUrls(permalinks)
}
