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

async function localChefVideoUrl(): Promise<string | undefined> {
  try {
    const response = await fetch(restaurant.chefVideo, { method: 'HEAD' })
    return response.ok ? restaurant.chefVideo : undefined
  } catch {
    return undefined
  }
}

export function ChefAboutMedia({ alt, caption }: ChefAboutMediaProps) {
  const frameRef = useRef<HTMLElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | undefined>()
  const [posterUrl, setPosterUrl] = useState<string>(restaurant.chefPhoto)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const localVideo = await localChefVideoUrl()
      if (!cancelled && localVideo) {
        setVideoUrl(localVideo)
      }

      try {
        const response = await fetch(
          `/api/instagram/preview?url=${encodeURIComponent(restaurant.chefReelUrl)}`,
        )
        if (!response.ok || cancelled) {
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
        // Keep local video / static photo — never Instagram embed chrome.
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
      void play().catch(() => {
        requestGestureUnlock()
      })
      if (!unlocked) {
        requestGestureUnlock()
      }
    }

    const onVideoError = () => {
      if (videoUrl !== restaurant.chefVideo) {
        void localChefVideoUrl().then((localVideo) => {
          setVideoUrl(localVideo)
        })
        return
      }
      setVideoUrl(undefined)
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
            key={videoUrl}
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
        ) : (
          <img src={posterUrl} alt={alt} loading="lazy" />
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
