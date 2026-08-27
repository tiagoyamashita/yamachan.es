import { useEffect, useRef, useState } from 'react'
import { restaurant } from './content.ts'

type PreviewResponse = {
  mediaUrl?: string
  videoUrl?: string
  isVideo?: boolean
}

type ChefAboutMediaProps = {
  alt: string
  caption: string
}

type MediaMode = 'loading' | 'video' | 'embed'

function embedSrc(permalink: string): string {
  const base = permalink.endsWith('/') ? permalink : `${permalink}/`
  return `${base}embed/`
}

export function ChefAboutMedia({ alt, caption }: ChefAboutMediaProps) {
  const frameRef = useRef<HTMLElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | undefined>()
  const [posterUrl, setPosterUrl] = useState<string>(restaurant.chefPhoto)
  const [mode, setMode] = useState<MediaMode>('loading')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch(
          `/api/instagram/preview?url=${encodeURIComponent(restaurant.chefReelUrl)}`,
        )
        if (cancelled) {
          return
        }
        if (!response.ok) {
          setMode('embed')
          return
        }
        const data = (await response.json()) as PreviewResponse
        if (cancelled) {
          return
        }
        if (data.mediaUrl) {
          setPosterUrl(data.mediaUrl)
        }
        if (data.videoUrl) {
          setVideoUrl(data.videoUrl)
          setMode('video')
          return
        }
        // Instagram often omits media_url for reels with licensed audio.
        setMode('embed')
      } catch {
        if (!cancelled) {
          setMode('embed')
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const frame = frameRef.current
    const video = videoRef.current
    if (!frame || !video || !videoUrl || mode !== 'video') {
      return
    }

    // Browsers only allow autoplay when muted; unmute after a user gesture.
    video.muted = true
    video.defaultMuted = true
    let inView = false
    let unlocked = false
    let waitingForGesture = false

    const play = () => video.play()

    const unmute = () => {
      unlocked = true
      video.muted = false
    }

    const onGesture = () => {
      if (!inView) {
        return
      }
      unmute()
      void play().catch(() => undefined)
    }

    const requestGestureUnlock = () => {
      if (waitingForGesture || unlocked) {
        return
      }
      waitingForGesture = true
      document.addEventListener('pointerdown', onGesture, { once: true })
      document.addEventListener('keydown', onGesture, { once: true })
    }

    const syncPlayback = () => {
      if (!inView || document.hidden) {
        video.pause()
        return
      }
      // pause() keeps currentTime, so play() resumes where it left off.
      void play().catch(() => {
        requestGestureUnlock()
      })
      if (!unlocked) {
        requestGestureUnlock()
      }
    }

    const onVideoError = () => {
      setMode('embed')
    }

    video.addEventListener('error', onVideoError)

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        inView = Boolean(entry?.isIntersecting)
        syncPlayback()
      },
      { threshold: 0.35 },
    )
    observer.observe(frame)

    const onVisibility = () => {
      syncPlayback()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      observer.disconnect()
      video.removeEventListener('error', onVideoError)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('pointerdown', onGesture)
      document.removeEventListener('keydown', onGesture)
    }
  }, [mode, videoUrl])

  return (
    <figure className="about-frame" ref={frameRef}>
      {mode === 'video' && videoUrl ? (
        <a
          className="about-frame-media"
          href={restaurant.chefReelUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={alt}
        >
          <video
            ref={videoRef}
            className="about-frame-video"
            src={videoUrl}
            poster={posterUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-label={alt}
          />
        </a>
      ) : mode === 'embed' ? (
        <div className="about-frame-embed-wrap">
          <iframe
            className="about-frame-embed"
            title={alt}
            src={embedSrc(restaurant.chefReelUrl)}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        <a
          className="about-frame-media"
          href={restaurant.chefReelUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={alt}
        >
          <img
            src={mode === 'loading' ? posterUrl : restaurant.chefPhoto}
            alt={alt}
            loading="lazy"
          />
        </a>
      )}
      <figcaption>
        <a href={restaurant.chefReelUrl} target="_blank" rel="noreferrer">
          {caption}
        </a>
      </figcaption>
    </figure>
  )
}
