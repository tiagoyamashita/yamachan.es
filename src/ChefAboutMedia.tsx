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

/**
 * Native video only — Instagram iframes cannot be play/paused on scroll.
 * Sources tried in order: Graph/CDN preview, then local /videos/chef-reel.mp4.
 */
export function ChefAboutMedia({ alt, caption }: ChefAboutMediaProps) {
  const frameRef = useRef<HTMLElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | undefined>()
  const [posterUrl, setPosterUrl] = useState<string>(restaurant.chefPhoto)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      // Start with the local file so scroll playback works offline / without API.
      setVideoUrl(restaurant.chefVideo)

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
          setFailed(false)
        }
      } catch {
        // Keep local video path.
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
    if (!frame || !video || !videoUrl || failed) {
      return
    }

    // Always start muted so browsers allow autoplay.
    video.defaultMuted = true
    video.muted = true
    video.setAttribute('muted', '')

    let inView = false
    let soundUnlocked = false

    const tryPlay = () => {
      if (!soundUnlocked) {
        video.muted = true
      }
      return video.play()
    }

    const syncPlayback = () => {
      if (!inView || document.hidden) {
        if (!video.paused) {
          video.pause()
        }
        return
      }
      void tryPlay().catch(() => undefined)
    }

    const onGesture = () => {
      if (!inView) {
        return
      }
      soundUnlocked = true
      video.muted = false
      void tryPlay().catch(() => undefined)
    }

    document.addEventListener('pointerdown', onGesture, { once: true })
    document.addEventListener('keydown', onGesture, { once: true })

    const onVideoError = () => {
      if (videoUrl !== restaurant.chefVideo) {
        setVideoUrl(restaurant.chefVideo)
        setFailed(false)
        return
      }
      setFailed(true)
      setVideoUrl(undefined)
    }

    const onLoaded = () => {
      syncPlayback()
    }

    video.addEventListener('error', onVideoError)
    video.addEventListener('loadeddata', onLoaded)

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        inView = Boolean(
          entry?.isIntersecting && (entry.intersectionRatio ?? 0) >= 0.25,
        )
        syncPlayback()
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    observer.observe(frame)

    const onVisibility = () => {
      syncPlayback()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      observer.disconnect()
      video.pause()
      video.removeEventListener('error', onVideoError)
      video.removeEventListener('loadeddata', onLoaded)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('pointerdown', onGesture)
      document.removeEventListener('keydown', onGesture)
    }
  }, [failed, videoUrl])

  return (
    <figure className="about-frame" ref={frameRef}>
      {videoUrl && !failed ? (
        <div className="about-frame-media">
          <video
            key={videoUrl}
            ref={videoRef}
            className="about-frame-video"
            src={videoUrl}
            poster={posterUrl}
            muted
            loop
            playsInline
            preload="auto"
            aria-label={alt}
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
