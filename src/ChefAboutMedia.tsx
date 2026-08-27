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

type MediaMode = 'loading' | 'video' | 'embed' | 'photo'

function embedSrc(permalink: string): string {
  const base = permalink.endsWith('/') ? permalink : `${permalink}/`
  return `${base}embed/`
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
  const [mode, setMode] = useState<MediaMode>('loading')

  useEffect(() => {
    let cancelled = false

    async function load() {
      const localVideo = await localChefVideoUrl()
      if (cancelled) {
        return
      }
      if (localVideo) {
        setVideoUrl(localVideo)
        setMode('video')
      }

      try {
        const response = await fetch(
          `/api/instagram/preview?url=${encodeURIComponent(restaurant.chefReelUrl)}`,
        )
        if (cancelled) {
          return
        }
        if (response.ok) {
          const data = (await response.json()) as PreviewResponse
          if (data.mediaUrl) {
            setPosterUrl(data.mediaUrl)
          }
          if (data.videoUrl) {
            setVideoUrl(data.videoUrl)
            setMode('video')
            return
          }
        }
      } catch {
        // Fall through to cropped embed / photo.
      }

      if (!cancelled && !localVideo) {
        // No CDN/local mp4 — use a cropped Instagram embed (chrome clipped in CSS).
        setMode('embed')
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

    video.muted = true
    video.defaultMuted = true
    video.setAttribute('muted', '')

    let inView = false
    let unlocked = false
    let waitingForGesture = false

    const play = () => {
      video.muted = true
      return video.play()
    }

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
          if (localVideo) {
            setVideoUrl(localVideo)
            setMode('video')
            return
          }
          setMode('embed')
        })
        return
      }
      setMode('embed')
    }

    video.addEventListener('error', onVideoError)

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        inView = Boolean(
          entry?.isIntersecting && (entry.intersectionRatio ?? 0) >= 0.2,
        )
        syncPlayback()
      },
      { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] },
    )
    observer.observe(frame)
    // In case the frame is already visible when the effect mounts.
    syncPlayback()

    const onVisibility = () => {
      syncPlayback()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      observer.disconnect()
      video.pause()
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
            key={videoUrl}
            ref={videoRef}
            className="about-frame-video"
            src={videoUrl}
            poster={posterUrl}
            muted
            loop
            playsInline
            autoPlay
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
          <img src={posterUrl} alt={alt} loading="lazy" />
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
