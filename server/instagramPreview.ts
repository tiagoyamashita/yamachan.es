import {
  fetchEmbedPreview,
  isAllowedInstagramMediaHost,
} from './instagramEmbed.ts'

export type InstagramPermalinkPreview = {
  permalink: string
  mediaUrl?: string
  videoUrl?: string
  isVideo: boolean
}

type GraphMedia = {
  id: string
  permalink?: string
  media_url?: string
  thumbnail_url?: string
  media_type?: string
}

type GraphPage = {
  data?: GraphMedia[]
  paging?: { next?: string }
}

const GRAPH_PAGE_LIMIT = 50
const GRAPH_MAX_PAGES = 10

function normalizePermalink(value: string): string {
  return value.split('?')[0].replace(/\/+$/, '')
}

function shortcodeFromPermalink(permalink: string): string | undefined {
  const match = permalink.match(/\/(?:reel|p|tv)\/([^/?#]+)/i)
  return match?.[1]
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

function graphItemMatches(item: GraphMedia, clean: string): boolean {
  if (!item.permalink) {
    return false
  }
  const itemPermalink = normalizePermalink(item.permalink)
  if (itemPermalink === clean) {
    return true
  }
  const wanted = shortcodeFromPermalink(clean)
  const got = shortcodeFromPermalink(itemPermalink)
  return Boolean(wanted && got && wanted === got)
}

function isGraphVideo(mediaType: string | undefined): boolean {
  return (
    mediaType === 'VIDEO' ||
    mediaType === 'REELS' ||
    mediaType === 'REEL'
  )
}

function previewFromGraphItem(
  clean: string,
  item: GraphMedia,
): InstagramPermalinkPreview {
  const video = isGraphVideo(item.media_type)
  const mediaUrl = proxyMediaUrl(
    video ? item.thumbnail_url ?? item.media_url : item.media_url,
  )
  const videoUrl = video ? proxyMediaUrl(item.media_url) : undefined
  return {
    permalink: clean,
    mediaUrl,
    videoUrl,
    isVideo: video || Boolean(videoUrl),
  }
}

async function fetchGraphPermalinkPreview(
  clean: string,
  token: string,
): Promise<InstagramPermalinkPreview | null> {
  // Keep fields aligned with the working feed Graph query — unsupported
  // fields (e.g. shortcode) make the whole request fail.
  const query = new URLSearchParams({
    fields: 'id,media_type,media_url,permalink,thumbnail_url',
    limit: String(GRAPH_PAGE_LIMIT),
    access_token: token,
  })

  let nextUrl: string | undefined =
    `https://graph.instagram.com/me/media?${query.toString()}`

  for (let page = 0; page < GRAPH_MAX_PAGES && nextUrl; page += 1) {
    const response = await fetch(nextUrl)
    if (!response.ok) {
      return null
    }
    const payload = (await response.json()) as GraphPage
    const hit = (payload.data ?? []).find((item) =>
      graphItemMatches(item, clean),
    )
    if (hit) {
      return previewFromGraphItem(clean, hit)
    }
    nextUrl = payload.paging?.next
  }

  return null
}

async function fetchEmbedPermalinkPreview(
  clean: string,
): Promise<InstagramPermalinkPreview | null> {
  const preview = await fetchEmbedPreview(clean)
  if (!preview) {
    return null
  }

  return {
    permalink: clean,
    mediaUrl: proxyMediaUrl(preview.mediaUrl),
    videoUrl: proxyMediaUrl(preview.videoUrl),
    isVideo: preview.isVideo || Boolean(preview.videoUrl),
  }
}

export async function loadInstagramPermalinkPreview(
  permalink: string,
): Promise<InstagramPermalinkPreview | null> {
  const clean = normalizePermalink(permalink.trim())
  if (!clean.startsWith('https://www.instagram.com/')) {
    return null
  }

  const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim()
  if (token) {
    try {
      const fromGraph = await fetchGraphPermalinkPreview(clean, token)
      if (fromGraph?.videoUrl || fromGraph?.mediaUrl) {
        return fromGraph
      }
    } catch {
      // Fall through to embed scrape.
    }
  }

  return fetchEmbedPermalinkPreview(clean)
}
