import { useEffect, useState } from 'react'

type InstagramComment = {
  id: string
  username: string
  text: string
}

type InstagramPost = {
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

type FeedResponse = {
  posts: InstagramPost[]
}

function isVideoPost(post: InstagramPost): boolean {
  return (
    Boolean(post.videoUrl) ||
    post.mediaType === 'VIDEO' ||
    post.mediaType === 'REELS' ||
    post.mediaType === 'REEL'
  )
}

function posterUrl(post: InstagramPost): string {
  return post.thumbnailUrl ?? post.mediaUrl ?? ''
}

function topComments(post: InstagramPost): InstagramComment[] {
  return post.comments.slice(0, 3)
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

function PostCard({
  post,
  title,
}: {
  post: InstagramPost
  title: string
}) {
  const video = post.videoUrl
  const poster = posterUrl(post)
  const image = isVideoPost(post) ? poster : post.mediaUrl ?? post.thumbnailUrl ?? ''
  const comments = topComments(post)
  const label = `${title} #${String(post.number)}`

  return (
    <article className="ig-card">
      <p className="ig-post-number">#{post.number}</p>
      <div className="ig-card-media">
        {video ? (
          <video
            key={video}
            className="ig-card-video"
            src={video}
            poster={poster || undefined}
            controls
            playsInline
            preload="metadata"
            aria-label={label}
          />
        ) : image ? (
          <a
            href={post.permalink}
            target="_blank"
            rel="noreferrer"
            aria-label={label}
          >
            <img src={image} alt="" loading="lazy" referrerPolicy="no-referrer" />
          </a>
        ) : (
          <a
            href={post.permalink}
            target="_blank"
            rel="noreferrer"
            aria-label={label}
          >
            <span className="ig-post-fallback">
              <InstagramGlyph />
            </span>
          </a>
        )}
      </div>
      {comments.length > 0 ? (
        <ul className="ig-card-comments">
          {comments.map((comment) => (
            <li key={comment.id}>
              <strong>{comment.username}</strong>
              <span>{comment.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ig-card-comments-empty">
          <a href={post.permalink} target="_blank" rel="noreferrer">
            View on Instagram
          </a>
        </p>
      )}
    </article>
  )
}

export function InstagramFeed({ title }: { title: string }) {
  const [posts, setPosts] = useState<InstagramPost[] | null>(null)
  const [index, setIndex] = useState(0)

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
        if (!cancelled) {
          setPosts(data.posts.slice(0, 5))
          setIndex(0)
        }
      } catch {
        if (!cancelled) setPosts([])
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const count = posts?.length ?? 1
  const goPrev = () => {
    setIndex((current) => (current - 1 + count) % count)
  }
  const goNext = () => {
    setIndex((current) => (current + 1) % count)
  }

  if (posts === null) {
    return (
      <div className="ig-carousel" aria-busy="true" aria-label={title}>
        <div className="ig-carousel-stage">
          <div className="ig-card ig-card-skeleton">
            <p className="ig-post-number">#1</p>
            <div className="ig-card-media" />
            <ul className="ig-card-comments">
              <li />
              <li />
              <li />
            </ul>
          </div>
        </div>
      </div>
    )
  }

  if (posts.length === 0) {
    return null
  }

  const active = posts[index] ?? posts[0]

  return (
    <div className="ig-carousel" aria-label={title}>
      <div className="ig-carousel-track">
        {posts.length > 1 ? (
          <button
            type="button"
            className="ig-carousel-nav"
            onClick={goPrev}
            aria-label="Previous post"
          >
            ‹
          </button>
        ) : null}

        <div className="ig-carousel-stage">
          <PostCard key={active.id} post={active} title={title} />
        </div>

        {posts.length > 1 ? (
          <button
            type="button"
            className="ig-carousel-nav"
            onClick={goNext}
            aria-label="Next post"
          >
            ›
          </button>
        ) : null}
      </div>

      {posts.length > 1 ? (
        <div className="ig-carousel-dots" role="tablist" aria-label={title}>
          {posts.map((post, postIndex) => (
            <button
              key={post.id}
              type="button"
              role="tab"
              className={`ig-carousel-dot${postIndex === index ? ' is-active' : ''}`}
              aria-selected={postIndex === index}
              aria-label={`Post #${String(post.number)}`}
              onClick={() => setIndex(postIndex)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
