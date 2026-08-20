import { useEffect, useState } from 'react'
import {
  copy,
  dishOrder,
  otherLocale,
  restaurant,
  type Locale,
} from './content.ts'
import { InstagramFeed } from './InstagramFeed.tsx'
import './App.css'

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

function formatRating(value: number, locale: Locale): string {
  const formatted = value.toFixed(1)
  switch (locale) {
    case 'es':
      return formatted.replace('.', ',')
    case 'en':
      return formatted
    default: {
      const _exhaustive: never = locale
      return _exhaustive
    }
  }
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
  const [locale, setLocale] = useState<Locale>('es')
  const t = copy[locale]

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = t.metaTitle
    const description = document.querySelector('meta[name="description"]')
    if (description) {
      description.setAttribute('content', t.metaDescription)
    }
  }, [locale, t.metaDescription, t.metaTitle])

  const toggleLocale = () => {
    setLocale(otherLocale(locale))
  }

  return (
    <>
      <a className="skip-link" href="#contenido">
        {locale === 'es' ? 'Saltar al contenido' : 'Skip to content'}
      </a>

      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#inicio">
            <NavLogo />
          </a>

          <nav className="desktop-nav" aria-label={locale === 'es' ? 'Principal' : 'Primary'}>
            <a href="#carta">{t.nav.carta}</a>
            <a href="#fotos">{t.nav.fotos}</a>
            <a href="#casa">{t.nav.historia}</a>
            <a href="#opiniones">{t.nav.opiniones}</a>
            <a href="#visita">{t.nav.visitas}</a>
            <button type="button" className="lang-btn" onClick={toggleLocale}>
              {t.langLabel}
            </button>
            <a className="btn btn-small" href="#visita">
              {t.nav.reservar}
            </a>
          </nav>

          <div className="header-actions">
            <button type="button" className="lang-btn" onClick={toggleLocale}>
              {t.langLabel}
            </button>
            <a className="btn btn-small" href="#visita">
              {t.nav.reservar}
            </a>
          </div>
        </div>
      </header>

      <main id="contenido">
        <section className="hero" id="inicio">
          <img
            className="hero-banner"
            src="/images/banner.png"
            alt={
              locale === 'es'
                ? 'Yamachan, auténtico restaurante japonés en Alicante'
                : 'Yamachan, authentic Japanese restaurant in Alicante'
            }
            fetchPriority="high"
          />
          <h1 className="visually-hidden">{t.heroTitle}</h1>
          <div className="hero-copy">
            <div className="hero-actions">
              <a className="btn" href="#visita">
                {t.heroReserve}
              </a>
              <a className="btn btn-outline" href="#carta">
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
                alt={
                  locale === 'es'
                    ? 'Masashi, chef del restaurante Yama-Chan, saludando en la puerta del local'
                    : 'Masashi, chef of Yama-Chan, waving at the restaurant door'
                }
                loading="lazy"
              />
              <figcaption>{t.aboutCaption}</figcaption>
            </figure>
          </div>
        </section>

        <section className="carta" id="carta">
          <div className="section-inner">
            <header className="section-head">
              <p className="kicker">{t.cartaEyebrow}</p>
              <h2>{t.cartaTitle}</h2>
              <p className="lead muted">{t.cartaLead}</p>
            </header>

            <ul className="dish-grid">
              {dishOrder.map((id) => {
                const dish = t.dishes[id]
                return (
                  <li key={id} className="dish-card">
                    <div className="dish-meta">
                      <p className="dish-ja">{dish.nameJa}</p>
                      <h3>{dish.name}</h3>
                      <p>{dish.blurb}</p>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="more-dishes">
              <p className="more-title">{t.moreDishesTitle}</p>
              <ul>
                {t.moreDishes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="veg-note">{t.vegNote}</p>
            </div>
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
            <ul className="review-grid">
              {t.reviews.map((review) => (
                <li key={review.author}>
                  <a
                    className="review-card"
                    href={restaurant.googleReviewsUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${review.author}: ${review.stars} ${t.reviewsOutOf}. ${t.reviewsOpenLabel}`}
                  >
                    <blockquote>
                      <p className="review-stars-row">
                        <StarRating
                          value={review.stars}
                          max={restaurant.googleMaxStars}
                        />
                        <span>
                          {review.stars} {t.reviewsOutOf}
                        </span>
                      </p>
                      <p className="review-quote">{review.quote}</p>
                      <footer>
                        — {review.author}
                        <cite>Google</cite>
                      </footer>
                    </blockquote>
                  </a>
                </li>
              ))}
            </ul>
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
                <a className="btn" href={restaurant.whatsapp}>
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
                  src={restaurant.mapsEmbed}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </section>
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
            <a href={`tel:${restaurant.phone}`}>{restaurant.phoneDisplay}</a>
          </p>
        </div>
      </footer>
    </>
  )
}
