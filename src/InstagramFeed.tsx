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
  mediaType: string
  caption?: string
  comments: InstagramComment[]
}

type FeedResponse = {
  posts: InstagramPost[]
}

function isVideoPost(post: InstagramPost): boolean {
  return (
    post.mediaType === 'VIDEO' ||
    post.mediaType === 'REELS' ||
    post.mediaType === 'REEL'
  )
}

function imageUrl(post: InstagramPost): string {
  if (isVideoPost(post)) {
    return post.thumbnailUrl ?? post.mediaUrl ?? ''
  }
  return post.mediaUrl ?? post.thumbnailUrl ?? ''
}

function paddedComments(post: InstagramPost): InstagramComment[] {
  return [
    ...post.comments.slice(0, 3),
    ...[1, 2, 3].slice(post.comments.length).map((commentNumber) => ({
      id: `${post.id}-pad-${String(commentNumber)}`,
      username: 'comment',
      text: `Comment ${String(commentNumber)}`,
    })),
  ].slice(0, 3)
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
  const image = imageUrl(post)
  const comments = paddedComments(post)

  return (
    <article className="ig-card">
      <p className="ig-post-number">#{post.number}</p>
      <a
        className="ig-card-media"
        href={post.permalink}
        target="_blank"
        rel="noreferrer"
        aria-label={`${title} #${String(post.number)}`}
      >
        {image ? (
          <img src={image} alt="" loading="lazy" />
        ) : (
          <span className="ig-post-fallback">
            <InstagramGlyph />
          </span>
        )}
      </a>
      <ul className="ig-card-comments">
        {comments.map((comment) => (
          <li key={comment.id}>
            <strong>{comment.username}</strong>
            <span>{comment.text}</span>
          </li>
        ))}
      </ul>
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

  const count = posts?.length ?? 5
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
        <button
          type="button"
          className="ig-carousel-nav"
          onClick={goPrev}
          aria-label="Previous post"
        >
          ‹
        </button>

        <div className="ig-carousel-stage">
          <PostCard post={active} title={title} />
        </div>

        <button
          type="button"
          className="ig-carousel-nav"
          onClick={goNext}
          aria-label="Next post"
        >
          ›
        </button>
      </div>

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
    </div>
  )
}
