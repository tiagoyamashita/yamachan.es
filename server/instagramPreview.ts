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

function normalizePermalink(value: string): string {
  return value.split('?')[0].replace(/\/+$/, '')
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

export async function loadInstagramPermalinkPreview(
  permalink: string,
): Promise<InstagramPermalinkPreview | null> {
  const clean = normalizePermalink(permalink.trim())
  if (!clean.startsWith('https://www.instagram.com/')) {
    return null
  }

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
