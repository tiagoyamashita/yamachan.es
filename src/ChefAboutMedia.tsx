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

export function ChefAboutMedia({ alt, caption }: ChefAboutMediaProps) {
  const frameRef = useRef<HTMLElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | undefined>()
  const [posterUrl, setPosterUrl] = useState(restaurant.chefPhoto)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch(
          `/api/instagram/preview?url=${encodeURIComponent(restaurant.chefReelUrl)}`,
        )
        if (!response.ok) {
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
        }
      } catch {
        // Keep the static chef photo fallback.
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
    if (!frame || !video || !videoUrl) {
      return
    }

    video.muted = false
    let inView = false
    let waitingForGesture = false

    const play = () => {
      video.muted = false
      return video.play()
    }

    const onGesture = () => {
      if (!inView) {
        return
      }
      void play().catch(() => undefined)
    }

    const requestGestureUnlock = () => {
      if (waitingForGesture) {
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
    }

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
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('pointerdown', onGesture)
      document.removeEventListener('keydown', onGesture)
    }
  }, [videoUrl])

  return (
    <figure className="about-frame" ref={frameRef}>
      <a
        className="about-frame-media"
        href={restaurant.chefReelUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={alt}
      >
        {videoUrl ? (
          <video
            ref={videoRef}
            className="about-frame-video"
            src={videoUrl}
            poster={posterUrl}
            autoPlay
            loop
            playsInline
            preload="auto"
            aria-label={alt}
          />
        ) : (
          <img src={restaurant.chefPhoto} alt={alt} loading="lazy" />
        )}
      </a>
      <figcaption>
        <a href={restaurant.chefReelUrl} target="_blank" rel="noreferrer">
          {caption}
        </a>
      </figcaption>
    </figure>
  )
}
