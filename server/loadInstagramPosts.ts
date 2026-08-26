import {
  fetchEmbedPreview,
  isAllowedInstagramMediaHost,
} from './instagramEmbed.ts'
import { getStoredInstagramPostUrls } from './adminInstagram.ts'

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
  videoUrl?: string
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

/** Defaults only when no admin / env URLs are configured. */
const PLACEHOLDER_PERMALINKS = [
  'https://www.instagram.com/p/DHVzldVq8WG/',
  'https://www.instagram.com/reel/Dbs-T-UM7eJ/',
] as const

const POST_COUNT = 5

function normalizePermalink(value: string): string {
  return value.split('?')[0].replace(/\/+$/, '')
}

function uniquePermalinks(permalinks: string[]): string[] {
  const seen = new Set<string>()
  return permalinks.filter((permalink) => {
    const key = normalizePermalink(permalink)
    if (!key || seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function proxyMediaUrl(cdnUrl: string | undefined): string | undefined {
  if (!cdnUrl) {
    return undefined
  }
  try {
    const parsed = new URL(cdnUrl)
    if (!isAllowedInstagramMediaHost(parsed.hostname)) {
      return cdnUrl
    }
  } catch {
    return cdnUrl
  }
  return `/api/instagram/media?url=${encodeURIComponent(cdnUrl)}`
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

function commentsFromCaption(
  postId: string,
  username: string,
  caption: string | undefined,
): InstagramComment[] {
  const text = caption?.trim()
  if (!text) {
    return []
  }
  return [
    {
      id: `${postId}-caption`,
      username: username || 'instagram',
      text,
    },
  ]
}

function isStubComment(text: string): boolean {
  return /^Comment \d+$/i.test(text.trim())
}

function isGraphVideo(mediaType: string | undefined): boolean {
  return (
    mediaType === 'VIDEO' ||
    mediaType === 'REELS' ||
    mediaType === 'REEL'
  )
}

function postsFromUrls(
  raw: string | undefined,
  options?: { padToFive?: boolean },
): InstagramPost[] {
  const fromEnv = raw
    ? uniquePermalinks(
        raw
          .split(/[\n,]/)
          .map((entry) => entry.trim())
          .filter((entry) => entry.startsWith('http')),
      )
    : []

  const padToFive = options?.padToFive !== false
  let permalinks =
    fromEnv.length > 0
      ? fromEnv.slice(0, POST_COUNT)
      : uniquePermalinks([...PLACEHOLDER_PERMALINKS])

  if (padToFive && fromEnv.length === 0) {
    // Only pad the built-in demo list; never duplicate configured URLs.
    while (permalinks.length < POST_COUNT) {
      const next =
        PLACEHOLDER_PERMALINKS[permalinks.length % PLACEHOLDER_PERMALINKS.length]
      if (!next || permalinks.includes(next)) {
        break
      }
      permalinks.push(next)
    }
  }

  permalinks = uniquePermalinks(permalinks).slice(0, POST_COUNT)

  return permalinks.map((permalink, index) => {
    const number = index + 1
    return {
      id: `permalink-${String(number)}-${normalizePermalink(permalink)}`,
      number,
      permalink,
      mediaType: 'IMAGE',
      comments: [],
    }
  })
}

function mapGraphPost(item: GraphMedia, number: number): InstagramPost | null {
  if (!item.permalink) {
    return null
  }
  const comments = commentsFromGraph(item)
  const captionComments = commentsFromCaption(
    item.id,
    'yamachan.es',
    item.caption,
  )
  const video = isGraphVideo(item.media_type)
  return {
    id: item.id,
    number,
    permalink: item.permalink,
    mediaUrl: proxyMediaUrl(item.media_url),
    thumbnailUrl: proxyMediaUrl(item.thumbnail_url ?? item.media_url),
    videoUrl: video ? proxyMediaUrl(item.media_url) : undefined,
    mediaType: item.media_type ?? 'IMAGE',
    caption: item.caption,
    comments: comments.length > 0 ? comments : captionComments,
  }
}

async function enrichPostFromEmbed(post: InstagramPost): Promise<InstagramPost> {
  if (post.videoUrl && (post.mediaUrl || post.thumbnailUrl)) {
    return {
      ...post,
      mediaUrl: proxyMediaUrl(post.mediaUrl) ?? post.mediaUrl,
      thumbnailUrl: proxyMediaUrl(post.thumbnailUrl) ?? post.thumbnailUrl,
      videoUrl: proxyMediaUrl(post.videoUrl) ?? post.videoUrl,
    }
  }

  try {
    const preview = await fetchEmbedPreview(post.permalink)
    if (!preview) {
      return post
    }

    const proxiedThumb = proxyMediaUrl(preview.mediaUrl)
    const proxiedVideo = proxyMediaUrl(preview.videoUrl)
    const existingReal = post.comments.filter((c) => !isStubComment(c.text))
    const comments =
      existingReal.length > 0
        ? existingReal.slice(0, 3)
        : commentsFromCaption(post.id, preview.username, preview.caption)

    return {
      ...post,
      mediaUrl: proxiedThumb,
      thumbnailUrl: proxiedThumb,
      videoUrl: proxiedVideo ?? post.videoUrl,
      mediaType:
        preview.isVideo || Boolean(proxiedVideo) ? 'VIDEO' : post.mediaType,
      caption: preview.caption || post.caption,
      comments,
    }
  } catch {
    return post
  }
}

async function loadFromGraph(
  token: string,
  fallback: InstagramPost[],
): Promise<InstagramPost[] | null> {
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
    return null
  }

  const payload = (await response.json()) as GraphResponse
  const graphPosts = (payload.data ?? [])
    .map((item, index) => mapGraphPost(item, index + 1))
    .filter((post): post is InstagramPost => post !== null)
    .slice(0, POST_COUNT)

  if (graphPosts.length === 0) {
    return null
  }

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

  if (matched.length === fallback.length && matched.length > 0) {
    return matched
  }

  const filled = [...graphPosts]
  while (filled.length < fallback.length) {
    const next = fallback[filled.length]
    filled.push(next)
  }
  return filled.slice(0, Math.max(fallback.length, 1)).map((post, index) => ({
    ...post,
    number: index + 1,
  }))
}

export async function loadInstagramPosts(
  token: string | undefined,
  permalinks?: string,
): Promise<InstagramPost[]> {
  const stored = (await getStoredInstagramPostUrls()).filter(Boolean)
  const hasConfigured = stored.length > 0 || Boolean(permalinks?.trim())
  const raw = stored.length > 0 ? stored.join('\n') : permalinks
  const fallback = postsFromUrls(raw, { padToFive: !hasConfigured })

  let posts = fallback
  if (token) {
    const fromGraph = await loadFromGraph(token, fallback)
    if (fromGraph) {
      posts = fromGraph
    }
  }

  return Promise.all(posts.map((post) => enrichPostFromEmbed(post)))
}
