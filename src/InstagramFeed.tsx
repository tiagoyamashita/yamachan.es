import { useEffect } from 'react'

type InstagramEmbeds = {
  Embeds: {
    process: () => void
  }
}

/** Numbered placeholders — swap permalinks later as needed. */
const PLACEHOLDER_POSTS = [
  {
    number: 1,
    permalink: 'https://www.instagram.com/reel/DMQLKHMs94d/',
  },
  {
    number: 2,
    permalink: 'https://www.instagram.com/reel/DMQLKHMs94d/',
  },
  {
    number: 3,
    permalink: 'https://www.instagram.com/reel/DMQLKHMs94d/',
  },
  {
    number: 4,
    permalink: 'https://www.instagram.com/reel/DMQLKHMs94d/',
  },
  {
    number: 5,
    permalink: 'https://www.instagram.com/reel/DMQLKHMs94d/',
  },
] as const

function getInstgrm(): InstagramEmbeds | undefined {
  const view = window as Window & { instgrm?: InstagramEmbeds }
  return view.instgrm
}

function useInstagramEmbed() {
  useEffect(() => {
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
  }, [])
}

export function InstagramFeed({ title }: { title: string }) {
  useInstagramEmbed()

  return (
    <ul className="ig-grid ig-grid-embeds" aria-label={title}>
      {PLACEHOLDER_POSTS.map((post) => (
        <li key={post.number} className="ig-post ig-post-embed">
          <p className="ig-post-number">#{post.number}</p>
          <blockquote
            className="instagram-media"
            data-instgrm-captioned
            data-instgrm-permalink={`${post.permalink}?utm_source=ig_embed&utm_campaign=loading`}
            data-instgrm-version="14"
          >
            <a
              href={`${post.permalink}?utm_source=ig_embed&utm_campaign=loading`}
              target="_blank"
              rel="noreferrer"
            >
              View this post on Instagram
            </a>
          </blockquote>
        </li>
      ))}
    </ul>
  )
}
