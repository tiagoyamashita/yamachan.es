export type InstagramComment = {
  id: string
  username: string
  text: string
}

export type InstagramPost = {
  id: string
  number: number
  permalink: string
  mediaUrl?: string
  thumbnailUrl?: string
  mediaType: string
  caption?: string
  comments: InstagramComment[]
}

type GraphComment = {
  id?: string
  text?: string
  username?: string
  from?: { username?: string }
}

type GraphMedia = {
  id: string
  permalink?: string
  media_url?: string
  thumbnail_url?: string
  media_type?: string
  caption?: string
  comments?: {
    data?: GraphComment[]
  }
}

type GraphResponse = {
  data?: GraphMedia[]
}

/** Numbered placeholders — swap permalinks later as needed. */
const PLACEHOLDER_PERMALINKS = [
  'https://www.instagram.com/reel/Dbs-T-UM7eJ/',
  'https://www.instagram.com/reel/Dbs-T-UM7eJ/',
  'https://www.instagram.com/reel/Dbs-T-UM7eJ/',
  'https://www.instagram.com/reel/Dbs-T-UM7eJ/',
  'https://www.instagram.com/reel/Dbs-T-UM7eJ/',
] as const

const POST_COUNT = 5

function normalizePermalink(value: string): string {
  return value.split('?')[0].replace(/\/+$/, '')
}

function commentsFromGraph(item: GraphMedia): InstagramComment[] {
  const rows = item.comments?.data ?? []
  return rows
    .flatMap((row, index) => {
      const text = row.text?.trim()
      if (!text) {
        return []
      }
      const username =
        row.username?.trim() ||
        row.from?.username?.trim() ||
        'instagram'
      return [
        {
          id: row.id ?? `${item.id}-c${String(index)}`,
          username,
          text,
        },
      ]
    })
    .slice(0, 3)
}

function placeholderComments(postNumber: number): InstagramComment[] {
  return [1, 2, 3].map((commentNumber) => ({
    id: `placeholder-${String(postNumber)}-${String(commentNumber)}`,
    username: 'comment',
    text: `Comment ${String(commentNumber)}`,
  }))
}

function postsFromUrls(raw: string | undefined): InstagramPost[] {
  const fromEnv = raw
    ? raw
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.startsWith('http'))
    : []

  const permalinks =
    fromEnv.length > 0 ? fromEnv.slice(0, POST_COUNT) : [...PLACEHOLDER_PERMALINKS]

  while (permalinks.length < POST_COUNT) {
    permalinks.push(PLACEHOLDER_PERMALINKS[permalinks.length] ?? PLACEHOLDER_PERMALINKS[0])
  }

  return permalinks.slice(0, POST_COUNT).map((permalink, index) => {
    const number = index + 1
    return {
      id: `permalink-${String(number)}`,
      number,
      permalink,
      mediaType: 'IMAGE',
      comments: placeholderComments(number),
    }
  })
}

function mapGraphPost(item: GraphMedia, number: number): InstagramPost | null {
  if (!item.permalink) {
    return null
  }
  const comments = commentsFromGraph(item)
  return {
    id: item.id,
    number,
    permalink: item.permalink,
    mediaUrl: item.media_url,
    thumbnailUrl: item.thumbnail_url,
    mediaType: item.media_type ?? 'IMAGE',
    caption: item.caption,
    comments:
      comments.length > 0 ? comments : placeholderComments(number),
  }
}

export async function loadInstagramPosts(
  token: string | undefined,
  permalinks?: string,
): Promise<InstagramPost[]> {
  const fallback = postsFromUrls(permalinks)

  if (!token) {
    return fallback
  }

  const query = new URLSearchParams({
    fields:
      'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,comments.limit(3){text,username,timestamp}',
    limit: String(POST_COUNT),
    access_token: token,
  })

  const response = await fetch(
    `https://graph.instagram.com/me/media?${query.toString()}`,
  )
  if (!response.ok) {
    return fallback
  }

  const payload = (await response.json()) as GraphResponse
  const graphPosts = (payload.data ?? [])
    .map((item, index) => mapGraphPost(item, index + 1))
    .filter((post): post is InstagramPost => post !== null)
    .slice(0, POST_COUNT)

  if (graphPosts.length === 0) {
    return fallback
  }

  // Prefer matching placeholder / env permalinks when provided.
  const wanted = fallback.map((post) => normalizePermalink(post.permalink))
  const byPermalink = new Map(
    graphPosts.map((post) => [normalizePermalink(post.permalink), post]),
  )
  const matched = wanted.flatMap((permalink, index) => {
    const hit = byPermalink.get(permalink)
    if (!hit) {
      return []
    }
    return [{ ...hit, number: index + 1 }]
  })

  if (matched.length === POST_COUNT) {
    return matched
  }

  const filled = [...graphPosts]
  while (filled.length < POST_COUNT) {
    const next = fallback[filled.length]
    filled.push(next)
  }
  return filled.slice(0, POST_COUNT).map((post, index) => ({
    ...post,
    number: index + 1,
  }))
}
