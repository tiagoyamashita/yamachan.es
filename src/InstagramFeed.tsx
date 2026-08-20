import { useEffect } from 'react'
import { restaurant } from './content.ts'

type InstagramEmbeds = {
  Embeds: {
    process: () => void
  }
}

function getInstgrm(): InstagramEmbeds | undefined {
  const view = window as Window & { instgrm?: InstagramEmbeds }
  return view.instgrm
}

export function InstagramFeed({ title }: { title: string }) {
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

  return (
    <div className="ig-embed-frame">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={restaurant.instagramUrl}
        data-instgrm-version="14"
      >
        <a href={restaurant.instagramUrl}>{title}</a>
      </blockquote>
    </div>
  )
}
