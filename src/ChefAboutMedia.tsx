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
 *
 * Prefers unmuted playback. Browsers may block that until any page gesture;
 * after the first click/tap/key we keep sound on for later scroll-ins.
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

    let inView = false
    // Prefer sound on; only fall back to mute if the browser blocks unmuted autoplay.
    let allowSound = true

    const applyMuteState = () => {
      video.muted = !allowSound
      video.defaultMuted = !allowSound
      if (allowSound) {
        video.removeAttribute('muted')
      } else {
        video.setAttribute('muted', '')
      }
    }

    const tryPlay = async () => {
      applyMuteState()
      try {
        await video.play()
        return
      } catch {
        // Unmuted autoplay blocked — retry muted, then unlock sound on next gesture.
        if (allowSound) {
          allowSound = false
          applyMuteState()
          try {
            await video.play()
          } catch {
            // Still blocked (rare); wait for a gesture.
          }
        }
      }
    }

    const syncPlayback = () => {
      if (!inView || document.hidden) {
        if (!video.paused) {
          video.pause()
        }
        return
      }
      void tryPlay()
    }

    const unlockSound = () => {
      allowSound = true
      applyMuteState()
      if (inView && !document.hidden) {
        void video.play().catch(() => undefined)
      }
    }

    // Any page interaction unlocks sound — not only a click on the video.
    document.addEventListener('pointerdown', unlockSound)
    document.addEventListener('keydown', unlockSound)

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

    // Attempt unmuted play immediately if already on screen.
    applyMuteState()
    syncPlayback()

    return () => {
      observer.disconnect()
      video.pause()
      video.removeEventListener('error', onVideoError)
      video.removeEventListener('loadeddata', onLoaded)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('pointerdown', unlockSound)
      document.removeEventListener('keydown', unlockSound)
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
