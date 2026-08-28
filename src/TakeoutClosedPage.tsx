import { useEffect, type MouseEvent } from 'react'
import { type Copy } from './i18n/index.ts'

export function TakeoutClosedPage({
  t,
  onHome,
  onNavigate,
}: {
  t: Copy
  onHome: (event: MouseEvent<HTMLAnchorElement>) => void
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
}) {
  useEffect(() => {
    document.title = `${t.takeoutClosedHeading} — Yama-Chan`
  }, [t.takeoutClosedHeading])

  return (
    <article className="carta-page takeout-page takeout-closed" id="para-llevar">
      <div className="section-inner">
        <header className="section-head">
          <p className="kicker">{t.nav.takeout}</p>
          <h1>{t.takeoutClosedHeading}</h1>
          <p className="lead muted">{t.takeoutClosedLead}</p>
        </header>
        <p className="takeout-closed-actions">
          <a
            className="btn"
            href="/carta"
            onClick={(event) => onNavigate(event, '/carta')}
          >
            {t.nav.carta}
          </a>
          <a
            className="btn btn-outline"
            href="/reservas"
            onClick={(event) => onNavigate(event, '/reservas')}
          >
            {t.nav.reservar}
          </a>
        </p>
        <p className="carta-back">
          <a href="/" onClick={onHome}>
            {t.cartaBackHome}
          </a>
        </p>
      </div>
    </article>
  )
}
