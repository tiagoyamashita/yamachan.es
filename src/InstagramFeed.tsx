import { useEffect, useState } from 'react'
import { restaurant } from './content.ts'

export type InstagramPost = {
  id: string
  permalink: string
  mediaUrl?: string
  thumbnailUrl?: string
  mediaType: string
  caption?: string
}

type FeedResponse = {
  posts: InstagramPost[]
}

type InstagramEmbeds = {
  Embeds: {
    process: () => void
  }
}

const POST_COUNT = 10
const SKELETON_KEYS = [
  's1',
  's2',
  's3',
  's4',
  's5',
  's6',
  's7',
  's8',
  's9',
  's10',
] as const

function getInstgrm(): InstagramEmbeds | undefined {
  const view = window as Window & { instgrm?: InstagramEmbeds }
  return view.instgrm
}

function isVideoPost(post: InstagramPost): boolean {
  return post.mediaType === 'VIDEO' || post.mediaType === 'REEL'
}

function thumbnailUrl(post: InstagramPost): string {
  if (isVideoPost(post)) {
    return post.thumbnailUrl ?? post.mediaUrl ?? ''
  }
  return post.mediaUrl ?? post.thumbnailUrl ?? ''
}

function embedUrl(permalink: string): string {
  const withSlash = permalink.endsWith('/') ? permalink : `${permalink}/`
  return `${withSlash}embed/captioned/`
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="ig-play-glyph">
      <circle cx="12" cy="12" r="10" fill="rgba(0,0,0,0.45)" />
      <path d="M9.5 7.5v9l7-4.5z" fill="#fff" />
    </svg>
  )
}

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="ig-fallback-glyph">
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
    </svg>
  )
}

function useInstagramEmbed(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-yamachan-instagram="embed"]',
    )
    if (existing) {
      getInstgrm()?.Embeds.process()
      return undefined
    }

    const script = document.createElement('script')
    script.src = 'https://www.instagram.com/embed.js'
    script.async = true
    script.dataset.yamachanInstagram = 'embed'
    script.onload = () => {
      getInstgrm()?.Embeds.process()
    }
    document.body.appendChild(script)
    return undefined
  }, [enabled])
}

function PostModal({
  post,
  onClose,
}: {
  post: InstagramPost
  onClose: () => void
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return (
    <div
      className="ig-modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="ig-modal" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="ig-modal-close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>
        <iframe
          key={post.id}
          title={post.caption?.trim() || 'Instagram post'}
          src={embedUrl(post.permalink)}
          loading="lazy"
          allow="encrypted-media; clipboard-write; autoplay"
          allowFullScreen
        />
        <a
          className="ig-modal-fallback-link"
          href={post.permalink}
          target="_blank"
          rel="noreferrer"
        >
          Ver en Instagram ↗
        </a>
      </div>
    </div>
  )
}

export function InstagramFeed({ title }: { title: string }) {
  const [posts, setPosts] = useState<InstagramPost[] | null>(null)
  const [activePost, setActivePost] = useState<InstagramPost | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch('/api/instagram')
        if (!response.ok) {
          if (!cancelled) setPosts([])
          return
        }
        const data = (await response.json()) as FeedResponse
        if (!cancelled) setPosts(data.posts.slice(0, POST_COUNT))
      } catch {
        if (!cancelled) setPosts([])
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const showProfileEmbed = posts !== null && posts.length === 0
  useInstagramEmbed(showProfileEmbed)

  if (posts === null) {
    return (
      <ul className="ig-grid" aria-busy="true">
        {SKELETON_KEYS.map((key) => (
          <li key={key} className="ig-post ig-post-skeleton" />
        ))}
      </ul>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="ig-embed-frame">
        <blockquote
          className="instagram-media"
          data-instgrm-permalink={restaurant.instagramUrl}
          data-instgrm-version="14"
        />
      </div>
    )
  }

  return (
    <>
      <ul className="ig-grid">
        {posts.map((post) => {
          const image = thumbnailUrl(post)
          const caption = post.caption?.trim() || title
          const video = isVideoPost(post)
          return (
            <li key={post.id} className="ig-post">
              <button
                type="button"
                className="ig-post-trigger"
                onClick={() => setActivePost(post)}
                aria-label={caption}
              >
                {image ? (
                  <>
                    <img src={image} alt={caption} loading="lazy" />
                    {video ? <PlayGlyph /> : null}
                  </>
                ) : (
                  <span className="ig-post-fallback">
                    <InstagramGlyph />
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      {activePost ? (
        <PostModal post={activePost} onClose={() => setActivePost(null)} />
      ) : null}
    </>
  )
}
