import { useEffect, useState } from 'react'
import {
  copy,
  dishImages,
  dishOrder,
  otherLocale,
  restaurant,
  type Locale,
} from './content.ts'
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

function Mark() {
  return (
    <svg className="mark" viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M8 42 L32 14 L56 42"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <path
        d="M20 42 L32 28 L44 42"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="50" r="2.2" fill="#b42318" />
    </svg>
  )
}

export default function App() {
  const [locale, setLocale] = useState<Locale>('es')
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const t = copy[locale]

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = t.metaTitle
    const description = document.querySelector('meta[name="description"]')
    if (description) {
      description.setAttribute('content', t.metaDescription)
    }
  }, [locale, t.metaDescription, t.metaTitle])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  const toggleLocale = () => {
    setLocale(otherLocale(locale))
    closeMenu()
  }

  return (
    <>
      <a className="skip-link" href="#contenido">
        {locale === 'es' ? 'Saltar al contenido' : 'Skip to content'}
      </a>

      <header className={scrolled ? 'site-header is-solid' : 'site-header'}>
        <div className="header-inner">
          <a className="brand" href="#inicio" onClick={closeMenu}>
            <Mark />
            <span>
              <strong>{restaurant.name}</strong>
              <em>{restaurant.nameJa}</em>
            </span>
          </a>

          <nav className="desktop-nav" aria-label={locale === 'es' ? 'Principal' : 'Primary'}>
            <a href="#carta">{t.nav.carta}</a>
            <a href="#casa">{t.nav.historia}</a>
            <a href="#visita">{t.nav.visitas}</a>
            <button type="button" className="lang-btn" onClick={toggleLocale}>
              {t.langLabel}
            </button>
            <a className="btn btn-small" href={restaurant.whatsapp}>
              {t.nav.reservar}
            </a>
          </nav>

          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? t.closeMenu : t.openMenu}
          </button>
        </div>

        {menuOpen ? (
          <nav id="mobile-nav" className="mobile-nav" aria-label={locale === 'es' ? 'Móvil' : 'Mobile'}>
            <a href="#carta" onClick={closeMenu}>
              {t.nav.carta}
            </a>
            <a href="#casa" onClick={closeMenu}>
              {t.nav.historia}
            </a>
            <a href="#visita" onClick={closeMenu}>
              {t.nav.visitas}
            </a>
            <button type="button" className="lang-btn" onClick={toggleLocale}>
              {t.langLabel}
            </button>
            <a className="btn" href={restaurant.whatsapp} onClick={closeMenu}>
              {t.nav.reservar}
            </a>
          </nav>
        ) : null}
      </header>

      <main id="contenido">
        <section className="hero" id="inicio">
          <img
            className="hero-photo"
            src="/images/hero-interior.jpg"
            alt={
              locale === 'es'
                ? 'Interior cálido del restaurante Yama-Chan en Alicante'
                : 'Warm interior of Yama-Chan restaurant in Alicante'
            }
            fetchPriority="high"
          />
          <div className="hero-shade" />
          <p className="hero-vert" aria-hidden="true">
            本物の日本料理
          </p>
          <div className="hero-copy">
            <p className="kicker gold">{t.heroKicker}</p>
            <h1>{t.heroTitle}</h1>
            <p className="lead">{t.heroLead}</p>
            <div className="hero-actions">
              <a className="btn" href={restaurant.whatsapp}>
                {t.heroReserve}
              </a>
              <a className="btn btn-ghost" href="#carta">
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
                src="/images/hero-interior.jpg"
                alt={
                  locale === 'es'
                    ? 'Sala pequeña de Yama-Chan, con mesas de madera'
                    : 'Yama-Chan’s small dining room with wooden tables'
                }
                loading="lazy"
              />
              <figcaption>
                {restaurant.nameJa} · {t.neighborhood}
              </figcaption>
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
                    <img src={dishImages[id]} alt={dish.name} loading="lazy" />
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

        <section className="reviews">
          <div className="section-inner">
            <header className="section-head">
              <p className="kicker">{t.reviewsEyebrow}</p>
              <h2>{t.reviewsTitle}</h2>
            </header>
            <ul className="review-grid">
              {t.reviews.map((review) => (
                <li key={review.author}>
                  <blockquote>
                    <p>{review.quote}</p>
                    <footer>— {review.author}</footer>
                  </blockquote>
                </li>
              ))}
            </ul>
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
                <a href={restaurant.instagramUrl}>
                  <InstagramIcon />
                  {restaurant.instagramHandle}
                </a>
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

        <section className="instagram-band">
          <div className="section-inner band-inner">
            <div>
              <h2>{t.instagramCtaTitle}</h2>
              <p>{t.instagramCtaBody}</p>
            </div>
            <a className="btn" href={restaurant.instagramUrl}>
              <InstagramIcon />
              {t.instagramCtaButton}
            </a>
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
            <a href={restaurant.instagramUrl}>{restaurant.instagramHandle}</a>
            {' · '}
            <a href={`tel:${restaurant.phone}`}>{restaurant.phoneDisplay}</a>
          </p>
        </div>
      </footer>

      <a className="sticky-reserve" href={restaurant.whatsapp}>
        {t.nav.reservar}
      </a>
    </>
  )
}
