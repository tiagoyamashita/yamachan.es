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

function previewUrl(post: InstagramPost): string {
  if (post.mediaType === 'VIDEO') {
    return post.thumbnailUrl ?? post.mediaUrl ?? ''
  }
  return post.mediaUrl ?? post.thumbnailUrl ?? ''
}

function embedUrl(permalink: string): string {
  const withSlash = permalink.endsWith('/') ? permalink : `${permalink}/`
  return `${withSlash}embed/`
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

export function InstagramFeed({ title }: { title: string }) {
  const [posts, setPosts] = useState<InstagramPost[] | null>(null)

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
        >
          <a href={restaurant.instagramUrl}>{title}</a>
        </blockquote>
      </div>
    )
  }

  return (
    <ul className="ig-grid">
      {posts.map((post) => {
        const image = previewUrl(post)
        const caption = post.caption?.trim() || title
        return (
          <li key={post.id} className="ig-post">
            <a href={post.permalink} rel="noreferrer">
              {image ? (
                <img src={image} alt={caption} loading="lazy" />
              ) : (
                <iframe
                  title={caption}
                  src={embedUrl(post.permalink)}
                  loading="lazy"
                  allow="encrypted-media; clipboard-write"
                />
              )}
            </a>
          </li>
        )
      })}
    </ul>
  )
}
