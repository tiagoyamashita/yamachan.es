import { useEffect, useState, type MouseEvent } from 'react'
import { restaurant } from './content.ts'
import {
  copy,
  detectLocale,
  formatRating,
  localeMeta,
  mapsEmbedUrl,
  persistLocale,
  whatsappUrl,
  type Locale,
} from './i18n/index.ts'
import { LanguagePicker } from './LanguagePicker.tsx'
import { CartaPage } from './CartaPage.tsx'
import { FeaturedDishes } from './FeaturedDishes.tsx'
// import { TakeoutPage } from './TakeoutPage.tsx'
import { ReservasPage } from './ReservasPage.tsx'
import { AdminPage } from './AdminPage.tsx'
import { InstagramFeed } from './InstagramFeed.tsx'
import { GoogleReviews } from './GoogleReviews.tsx'
import './App.css'

type Route = '/' | '/carta' | '/para-llevar' | '/reservas' | '/admin'

function routeFromLocation(): Route {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  switch (path) {
    case '/carta':
      return '/carta'
    case '/para-llevar':
      return '/para-llevar'
    case '/reservas':
      return '/reservas'
    case '/admin':
      return '/admin'
    default:
      return '/'
  }
}

function isModifiedClick(event: MouseEvent<HTMLElement>): boolean {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  )
}

function navigateTo(href: string) {
  const url = new URL(href, window.location.origin)
  const next = `${url.pathname}${url.hash}`
  const current = `${window.location.pathname}${window.location.hash}`
  if (next !== current) {
    window.history.pushState({}, '', next)
  }
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
    </svg>
  )
}

const STAR_GLYPHS = '★★★★★'

function StarRating({
  value,
  max,
}: {
  value: number
  max: number
}) {
  const percent = Math.max(0, Math.min(value / max, 1)) * 100
  return (
    <span className="star-rating" aria-hidden="true">
      <span className="star-rating-bg">{STAR_GLYPHS}</span>
      <span className="star-rating-fill" style={{ width: `${percent}%` }}>
        {STAR_GLYPHS}
      </span>
    </span>
  )
}

function Mark() {
  return (
    <img
      className="mark"
      src="/images/logo.jpg"
      alt=""
      width={40}
      height={40}
    />
  )
}

function NavLogo() {
  return (
    <img
      className="nav-logo"
      src="/images/nav-logo.png"
      alt={restaurant.name}
      width={72}
      height={72}
    />
  )
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(detectLocale)
  const [route, setRoute] = useState<Route>(routeFromLocation)
  const [hash, setHash] = useState(() => window.location.hash)
  const t = copy[locale]
  const onCarta = route === '/carta'
  const onTakeout = route === '/para-llevar'
  const onReserve = route === '/reservas'
  const onAdmin = route === '/admin'

  useEffect(() => {
    const syncRoute = () => {
      if (window.location.hash === '#carta') {
        window.history.replaceState({}, '', '/carta')
      }
      setRoute(routeFromLocation())
      setHash(window.location.hash)
    }

    window.addEventListener('popstate', syncRoute)
    syncRoute()
    return () => {
      window.removeEventListener('popstate', syncRoute)
    }
  }, [])

  useEffect(() => {
    if (onCarta || onTakeout || onReserve || onAdmin) {
      window.scrollTo(0, 0)
      return
    }

    const id = hash.replace('#', '')
    if (!id) {
      window.scrollTo(0, 0)
      return
    }

    document.getElementById(id)?.scrollIntoView()
  }, [onAdmin, onCarta, onReserve, onTakeout, route, hash])

  useEffect(() => {
    persistLocale(locale)
    document.documentElement.lang = localeMeta[locale].htmlLang
    const meta = (() => {
      switch (route) {
        case '/carta':
          return {
            title: t.cartaPageTitle,
            description: t.cartaPageDescription,
          }
        case '/para-llevar':
          return {
            title: t.takeoutPageTitle,
            description: t.takeoutPageDescription,
          }
        case '/reservas':
          return {
            title: t.reservePageTitle,
            description: t.reservePageDescription,
          }
        case '/admin':
          return {
            title: t.adminPageTitle,
            description: t.adminLead,
          }
        case '/':
          return { title: t.metaTitle, description: t.metaDescription }
        default: {
          const _exhaustive: never = route
          return _exhaustive
        }
      }
    })()
    document.title = meta.title
    const description = document.querySelector('meta[name="description"]')
    if (description) {
      description.setAttribute('content', meta.description)
    }
  }, [
    locale,
    route,
    t.cartaPageDescription,
    t.cartaPageTitle,
    t.metaDescription,
    t.metaTitle,
    t.takeoutPageDescription,
    t.takeoutPageTitle,
    t.reservePageDescription,
    t.reservePageTitle,
    t.adminPageTitle,
    t.adminLead,
  ])

  const go = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (isModifiedClick(event)) {
      return
    }
    event.preventDefault()
    navigateTo(href)
  }

  return (
    <>
      {onAdmin ? (
        <AdminPage
          t={t}
          locale={locale}
          onHome={(event) => go(event, '/')}
          onLocaleChange={setLocale}
        />
      ) : (
        <>
      <a className="skip-link" href="#contenido">
        {t.skipToContent}
      </a>

      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="/" onClick={(event) => go(event, '/')}>
            <NavLogo />
          </a>

          <nav className="desktop-nav" aria-label={t.navAria}>
            <a href="/#casa" onClick={(event) => go(event, '/#casa')}>
              {t.nav.historia}
            </a>
            <a href="/#fotos" onClick={(event) => go(event, '/#fotos')}>
              {t.nav.fotos}
            </a>
            <a
              href="/carta"
              aria-current={onCarta ? 'page' : undefined}
              onClick={(event) => go(event, '/carta')}
            >
              {t.nav.carta}
            </a>
            <a href="/#opiniones" onClick={(event) => go(event, '/#opiniones')}>
              {t.nav.opiniones}
            </a>
            <a href="/#visita" onClick={(event) => go(event, '/#visita')}>
              {t.nav.visitas}
            </a>
            {/* <a
              href="/para-llevar"
              aria-current={onTakeout ? 'page' : undefined}
              onClick={(event) => go(event, '/para-llevar')}
            >
              {t.nav.takeout}
            </a> */}
            <LanguagePicker locale={locale} onChange={setLocale} />
            <a
              className="btn btn-small"
              href="/reservas"
              aria-current={onReserve ? 'page' : undefined}
              onClick={(event) => go(event, '/reservas')}
            >
              {t.nav.reservar}
            </a>
          </nav>

          <div className="header-actions">
            <a
              className="header-carta"
              href="/carta"
              aria-current={onCarta ? 'page' : undefined}
              onClick={(event) => go(event, '/carta')}
            >
              {t.nav.carta}
            </a>
            {/* <a
              className="header-carta"
              href="/para-llevar"
              aria-current={onTakeout ? 'page' : undefined}
              onClick={(event) => go(event, '/para-llevar')}
            >
              {t.nav.takeout}
            </a> */}
            <LanguagePicker locale={locale} onChange={setLocale} />
            <a
              className="btn btn-small"
              href="/reservas"
              aria-current={onReserve ? 'page' : undefined}
              onClick={(event) => go(event, '/reservas')}
            >
              {t.nav.reservar}
            </a>
          </div>
        </div>
      </header>

      <main id="contenido">
        {onCarta ? (
          <CartaPage
            t={t}
            locale={locale}
            onHome={(event) => go(event, '/')}
          />
        ) : onTakeout ? (
          <TakeoutPage
            t={t}
            locale={locale}
            hash={hash}
            onHome={(event) => go(event, '/')}
            onNavigate={go}
          />
        ) : onReserve ? (
          <ReservasPage
            t={t}
            locale={locale}
            onHome={(event) => go(event, '/')}
          />
        ) : (
          <>
            <section className="hero" id="inicio">
              <img
                className="hero-banner"
                src="/images/banner.png"
                alt={t.heroBannerAlt}
                fetchPriority="high"
              />
              <h1 className="visually-hidden">{t.heroTitle}</h1>
              <div className="hero-copy">
                <div className="hero-actions">
                  <a
                    className="btn"
                    href="/reservas"
                    onClick={(event) => go(event, '/reservas')}
                  >
                    {t.heroReserve}
                  </a>
                  <a
                    className="btn btn-outline"
                    href="/carta"
                    onClick={(event) => go(event, '/carta')}
                  >
                    {t.heroCarta}
                  </a>
                </div>
                <p className="rating">{t.heroRating}</p>
              </div>
            </section>

            <section className="about" id="casa">
              <div className="section-inner about-grid">
                <div>
                  <p className="kicker">{t.aboutEyebrow}</p>
                  <h2>{t.aboutTitle}</h2>
                  {t.aboutBody.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  <p className="about-note">{t.aboutNote}</p>
                </div>
                <figure className="about-frame">
                  <img
                    src="/images/chef-masashi.png"
                    alt={t.chefPhotoAlt}
                    loading="lazy"
                  />
                  <figcaption>{t.aboutCaption}</figcaption>
                </figure>
              </div>
            </section>

            <section className="carta carta-teaser" id="carta-inicio">
              <div className="section-inner">
                <header className="section-head">
                  <p className="kicker">{t.cartaEyebrow}</p>
                  <h2>{t.cartaTitle}</h2>
                  <p className="lead muted">{t.cartaLead}</p>
                </header>
                <FeaturedDishes locale={locale} />
                <p className="carta-teaser-cta">
                  <a
                    className="btn"
                    href="/carta"
                    onClick={(event) => go(event, '/carta')}
                  >
                    {t.cartaCta}
                  </a>
                </p>
              </div>
            </section>

            <section className="instagram-feed" id="fotos">
              <div className="section-inner">
                <header className="section-head">
                  <p className="kicker">{t.instagram}</p>
                  <h2>{t.instagramCtaTitle}</h2>
                </header>
                <InstagramFeed title={restaurant.instagramHandle} />
                <p className="ig-follow">
                  <a className="btn btn-instagram" href={restaurant.instagramUrl}>
                    <InstagramIcon />
                    {t.instagramCtaButton}{' '}
                    <span className="ig-handle">{restaurant.instagramHandle}</span>
                  </a>
                </p>
              </div>
            </section>

            <section className="reviews" id="opiniones">
              <div className="section-inner">
                <header className="section-head">
                  <p className="kicker">{t.reviewsEyebrow}</p>
                  <h2>{t.reviewsTitle}</h2>
                  <a
                    className="google-rating"
                    href={restaurant.googleReviewsUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t.reviewsRating}
                  >
                    <StarRating
                      value={restaurant.googleRating}
                      max={restaurant.googleMaxStars}
                    />
                    <span>
                      <b>{formatRating(restaurant.googleRating, locale)}</b>{' '}
                      {t.reviewsOutOf}
                      {' · '}
                      {restaurant.googleReviewCount} {t.reviewsCountSuffix}
                    </span>
                  </a>
                </header>
                <GoogleReviews
                  outOf={t.reviewsOutOf}
                  openLabel={t.reviewsOpenLabel}
                />
                <p className="reviews-cta">
                  <a
                    className="btn btn-ghost"
                    href={restaurant.googleReviewsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t.reviewsCta}
                  </a>
                </p>
              </div>
            </section>

            <section className="visit" id="visita">
              <div className="section-inner visit-grid">
                <div>
                  <p className="kicker">{t.visitEyebrow}</p>
                  <h2>{t.visitTitle}</h2>
                  <p className="lead muted">{t.visitLead}</p>

                  <div className="visit-actions">
                    <a
                      className="btn"
                      href="/reservas"
                      onClick={(event) => go(event, '/reservas')}
                    >
                      {t.nav.reservar}
                    </a>
                    <a className="btn btn-outline" href={whatsappUrl(t.whatsappReserveText)}>
                      {t.whatsapp}
                    </a>
                    <a className="btn btn-outline" href={`tel:${restaurant.phone}`}>
                      {t.call} {restaurant.phoneDisplay}
                    </a>
                  </div>

                  <div className="hours">
                    <h3>{t.hoursTitle}</h3>
                    <ul>
                      {t.hours.map((row) => (
                        <li key={row.days}>
                          <span>{row.days}</span>
                          <b>{row.time}</b>
                        </li>
                      ))}
                    </ul>
                    <p className="hours-note">{t.hoursNote}</p>
                  </div>
                </div>

                <div className="place">
                  <h3>{t.addressTitle}</h3>
                  <address>
                    {t.addressLines.map((line) => (
                      <span key={line}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </address>
                  <p className="neighborhood">{t.neighborhood}</p>
                  <div className="place-links">
                    <a href={restaurant.mapsUrl}>{t.directions}</a>
                  </div>
                  <div className="map-wrap">
                    <iframe
                      title={t.addressTitle}
                      src={mapsEmbedUrl(locale)}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="site-footer">
        <div className="section-inner footer-inner">
          <div className="brand footer-brand">
            <Mark />
            <span>
              <strong>{restaurant.name}</strong>
              <em>{restaurant.nameJa}</em>
            </span>
          </div>
          <p>{t.footerTag}</p>
          <p>
            <a href="/carta" onClick={(event) => go(event, '/carta')}>
              {t.nav.carta}
            </a>
            {' · '}
            {/* <a
              href="/para-llevar"
              onClick={(event) => go(event, '/para-llevar')}
            >
              {t.nav.takeout}
            </a> */}
            {' · '}
            <a href="/reservas" onClick={(event) => go(event, '/reservas')}>
              {t.nav.reservar}
            </a>
            {' · '}
            <a href={`tel:${restaurant.phone}`}>{restaurant.phoneDisplay}</a>
          </p>
        </div>
      </footer>
        </>
      )}
    </>
  )
}
