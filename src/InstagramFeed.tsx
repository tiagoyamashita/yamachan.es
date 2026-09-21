import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

type InstagramPost = {
  id: string
  number: number
  photoUrl: string
}

type FeedResponse = {
  posts: InstagramPost[]
}

const SWIPE_THRESHOLD_PX = 40

function PostCard({
  post,
  title,
  followHref,
  showNav,
  onPrev,
  onNext,
  follow,
  onMediaPointerDown,
  onMediaPointerMove,
  onMediaPointerUp,
  onMediaPointerCancel,
}: {
  post: InstagramPost
  title: string
  followHref: string
  showNav: boolean
  onPrev: () => void
  onNext: () => void
  follow: ReactNode
  onMediaPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  onMediaPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void
  onMediaPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  onMediaPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void
}) {
  const label = `${title} #${String(post.number)}`

  return (
    <article className="ig-card">
      <p className="ig-post-number">#{post.number}</p>
      <div
        className="ig-card-media"
        onPointerDown={onMediaPointerDown}
        onPointerMove={onMediaPointerMove}
        onPointerUp={onMediaPointerUp}
        onPointerCancel={onMediaPointerCancel}
      >
        <a
          href={followHref}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          draggable={false}
        >
          <img
            src={post.photoUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            draggable={false}
          />
        </a>

        {showNav ? (
          <>
            <button
              type="button"
              className="ig-carousel-nav is-prev"
              onClick={onPrev}
              aria-label="Previous post"
            >
              ‹
            </button>
            <button
              type="button"
              className="ig-carousel-nav is-next"
              onClick={onNext}
              aria-label="Next post"
            >
              ›
            </button>
          </>
        ) : null}
      </div>
      <div className="ig-card-follow">{follow}</div>
    </article>
  )
}

export function InstagramFeed({
  title,
  followHref,
  followLabel,
  followHandle,
  followIcon,
}: {
  title: string
  followHref: string
  followLabel: string
  followHandle: string
  followIcon: ReactNode
}) {
  const [posts, setPosts] = useState<InstagramPost[] | null>(null)
  const [index, setIndex] = useState(0)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
  } | null>(null)

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

  const onMediaPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!posts || posts.length < 2) {
      return
    }
    const target = event.target as HTMLElement | null
    if (target?.closest('button')) {
      return
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onMediaPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
  }

  const finishDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    clientX: number,
    clientY: number,
  ) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    dragRef.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // already released
    }

    const dx = clientX - drag.startX
    const dy = clientY - drag.startY
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) {
      return
    }

    event.preventDefault()
    if (dx < 0) {
      goNext()
    } else {
      goPrev()
    }
  }

  const onMediaPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    finishDrag(event, event.clientX, event.clientY)
  }

  const onMediaPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // already released
    }
  }

  const follow = (
    <a className="btn btn-instagram" href={followHref}>
      {followIcon}
      {followLabel} <span className="ig-handle">{followHandle}</span>
    </a>
  )

  if (posts === null) {
    return (
      <div className="ig-carousel" aria-busy="true" aria-label={title}>
        <div className="ig-card ig-card-skeleton">
          <p className="ig-post-number">#1</p>
          <div className="ig-card-media" />
          <div className="ig-card-follow">
            <span className="ig-follow-skeleton" />
          </div>
        </div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="ig-carousel" aria-label={title}>
        <div className="ig-card-follow ig-card-follow-solo">{follow}</div>
      </div>
    )
  }

  const active = posts[index] ?? posts[0]
  const showNav = posts.length > 1

  return (
    <div className="ig-carousel" aria-label={title}>
      <PostCard
        key={active.id}
        post={active}
        title={title}
        followHref={followHref}
        showNav={showNav}
        onPrev={goPrev}
        onNext={goNext}
        follow={follow}
        onMediaPointerDown={onMediaPointerDown}
        onMediaPointerMove={onMediaPointerMove}
        onMediaPointerUp={onMediaPointerUp}
        onMediaPointerCancel={onMediaPointerCancel}
      />

      {showNav ? (
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
