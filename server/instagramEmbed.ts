export type InstagramEmbedPreview = {
  username: string
  caption: string
  mediaUrl: string
  videoUrl?: string
  isVideo: boolean
}

const EMBED_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'

function decodeJsonString(value: string): string {
  let text = value
  // Embed HTML often nests JSON, so backslashes may be doubled.
  while (text.includes('\\\\')) {
    text = text.replaceAll('\\\\', '\\')
  }
  return text
    .replace(/\\\//g, '/')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
}

function pickMediaUrl(html: string, options?: { preferVideoCover?: boolean }): string | undefined {
  const urls = [...html.matchAll(/src="(https:\/\/scontent[^"]+)"/g)].map((match) =>
    match[1].replaceAll('&amp;', '&'),
  )
  if (urls.length === 0) {
    return undefined
  }

  const notAvatar = (src: string) => !src.includes('t51.2885-19')
  // Related / suggested reel covers appear on every embed page — do not prefer these for photos.
  const isRelatedCover = (src: string) => src.includes('t51.71878')

  if (options?.preferVideoCover) {
    return (
      urls.find((src) => isRelatedCover(src) && notAvatar(src)) ??
      urls.find(notAvatar) ??
      urls[0]
    )
  }

  return (
    urls.find((src) => src.includes('t51.82787')) ??
    urls.find((src) => notAvatar(src) && !isRelatedCover(src)) ??
    urls.find(notAvatar) ??
    urls[0]
  )
}

function pickVideoUrl(html: string): string | undefined {
  const match =
    html.match(/video_url\\":\\"((?:\\\\.|[^"\\])*)\\"/) ??
    html.match(/"video_url":"((?:\\.|[^"\\])*)"/)
  if (!match?.[1]) {
    return undefined
  }
  const decoded = decodeJsonString(match[1]).trim()
  return decoded.startsWith('https://') ? decoded : undefined
}

export async function fetchEmbedPreview(
  permalink: string,
): Promise<InstagramEmbedPreview | null> {
  const clean = permalink.split('?')[0].replace(/\/+$/, '')
  const embedUrl = `${clean}/embed/captioned/`

  const response = await fetch(embedUrl, {
    headers: {
      'User-Agent': EMBED_UA,
      Accept: 'text/html',
    },
    redirect: 'follow',
  })
  if (!response.ok) {
    return null
  }

  const html = await response.text()
  const videoUrl = pickVideoUrl(html)
  const preferVideoCover =
    Boolean(videoUrl) ||
    /\/reel\//i.test(clean) ||
    html.includes('"is_video":true') ||
    html.includes('video_view_count') ||
    html.includes('\\"is_video\\":true')
  const mediaUrl = pickMediaUrl(html, { preferVideoCover })
  if (!mediaUrl) {
    return null
  }

  const usernameMatch = html.match(
    /instagram\.com\/([A-Za-z0-9._]+)\/\?utm_source=ig_embed/,
  )
  const captionMatch =
    html.match(
      /edge_media_to_caption\\":\{\\"edges\\":\[\{\\"node\\":\{\\"text\\":\\"((?:\\\\.|[^"\\])*)\\"/,
    ) ??
    html.match(
      /"edge_media_to_caption":\{"edges":\[\{"node":\{"text":"((?:\\.|[^"\\])*)"/,
    )

  let caption = ''
  if (captionMatch?.[1]) {
    caption = decodeJsonString(captionMatch[1]).trim()
  } else {
    const htmlCaption = html.match(
      /class="Caption"[^>]*>[\s\S]*?<\/a>([\s\S]*?)<\/div>/,
    )
    if (htmlCaption?.[1]) {
      caption = htmlCaption[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim()
    }
  }

  const isVideo = preferVideoCover

  return {
    username: usernameMatch?.[1] ?? 'instagram',
    caption,
    mediaUrl,
    videoUrl,
    isVideo,
  }
}

export function isAllowedInstagramMediaHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return (
    host.endsWith('.cdninstagram.com') ||
    host.endsWith('.fbcdn.net') ||
    host === 'cdninstagram.com' ||
    host === 'fbcdn.net'
  )
}

export async function fetchInstagramMedia(
  mediaUrl: string,
  incoming?: Request,
): Promise<Response | null> {
  let parsed: URL
  try {
    parsed = new URL(mediaUrl)
  } catch {
    return null
  }

  if (
    parsed.protocol !== 'https:' ||
    !isAllowedInstagramMediaHost(parsed.hostname)
  ) {
    return null
  }

  const headers: Record<string, string> = {
    'User-Agent': EMBED_UA,
    Referer: 'https://www.instagram.com/',
    Accept: 'video/mp4,video/*,image/avif,image/webp,image/*,*/*;q=0.8',
  }
  const range = incoming?.headers.get('Range')
  if (range) {
    headers.Range = range
  }

  const response = await fetch(parsed.toString(), {
    headers,
    redirect: 'follow',
  })
  if (!response.ok && response.status !== 206) {
    return null
  }

  const out = new Headers()
  out.set(
    'Content-Type',
    response.headers.get('content-type') ?? 'application/octet-stream',
  )
  out.set('Cache-Control', 'public, max-age=3600')
  out.set('Accept-Ranges', 'bytes')
  const contentLength = response.headers.get('content-length')
  if (contentLength) {
    out.set('Content-Length', contentLength)
  }
  const contentRange = response.headers.get('content-range')
  if (contentRange) {
    out.set('Content-Range', contentRange)
  }

  return new Response(response.body, {
    status: response.status,
    headers: out,
  })
}
