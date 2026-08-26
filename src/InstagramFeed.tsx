/** Numbered placeholders — swap permalinks later as needed. */
const PLACEHOLDER_POSTS = [
  {
    number: 1,
    permalink: 'https://www.instagram.com/reel/Dbs-T-UM7eJ/',
  },
  {
    number: 2,
    permalink: 'https://www.instagram.com/reel/Dbs-T-UM7eJ/',
  },
  {
    number: 3,
    permalink: 'https://www.instagram.com/reel/Dbs-T-UM7eJ/',
  },
  {
    number: 4,
    permalink: 'https://www.instagram.com/reel/Dbs-T-UM7eJ/',
  },
  {
    number: 5,
    permalink: 'https://www.instagram.com/reel/Dbs-T-UM7eJ/',
  },
] as const

function embedSrc(permalink: string): string {
  const base = permalink.endsWith('/') ? permalink : `${permalink}/`
  return `${base}embed/captioned/`
}

export function InstagramFeed({ title }: { title: string }) {
  return (
    <ul className="ig-grid ig-grid-embeds" aria-label={title}>
      {PLACEHOLDER_POSTS.map((post) => (
        <li key={post.number} className="ig-post ig-post-embed">
          <p className="ig-post-number">#{post.number}</p>
          <div className="ig-embed-card">
            <iframe
              title={`Instagram post #${post.number}`}
              src={embedSrc(post.permalink)}
              loading="lazy"
              allow="encrypted-media; clipboard-write; autoplay; fullscreen"
              allowFullScreen
            />
            <a
              className="ig-embed-open"
              href={post.permalink}
              target="_blank"
              rel="noreferrer"
            >
              View on Instagram ↗
            </a>
          </div>
        </li>
      ))}
    </ul>
  )
}
