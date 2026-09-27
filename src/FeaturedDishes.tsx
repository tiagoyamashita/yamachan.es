import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { getSupabase } from './supabase.ts'
import { copy, showJapaneseCaption, type Locale } from './i18n/index.ts'
import { catalogCopy } from './menu.ts'

export type FeaturedDish = {
  id: string
  slug: string
  name_es: string
  name_en: string
  name_ja: string
  blurb_es: string
  blurb_en: string
  image_url: string
  review_quote_es: string
  review_quote_en: string
  review_author: string
  sort_order: number
}

const SKELETON_KEYS = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'] as const
const MOBILE_QUERY = '(max-width: 799px)'
const SWIPE_THRESHOLD_PX = 40

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    if (value?.trim()) {
      return value
    }
  }
  return ''
}

function dishCopy(dish: FeaturedDish, locale: Locale) {
  const fromCatalog = catalogCopy(dish.slug, locale)
  switch (locale) {
    case 'es':
      return {
        name: dish.name_es,
        blurb: dish.blurb_es,
        quote: dish.review_quote_es,
      }
    case 'en':
      return {
        name: firstNonEmpty(dish.name_en, dish.name_es),
        blurb: firstNonEmpty(dish.blurb_en, dish.blurb_es),
        quote: firstNonEmpty(dish.review_quote_en, dish.review_quote_es),
      }
    case 'ja':
      return {
        name: firstNonEmpty(dish.name_ja, dish.name_es, fromCatalog?.name),
        blurb: firstNonEmpty(dish.blurb_en, dish.blurb_es, fromCatalog?.blurb),
        quote: firstNonEmpty(dish.review_quote_en, dish.review_quote_es),
      }
    case 'pt-BR':
      return {
        name: firstNonEmpty(dish.name_es, dish.name_en, fromCatalog?.name),
        blurb: firstNonEmpty(dish.blurb_es, dish.blurb_en, fromCatalog?.blurb),
        quote: firstNonEmpty(dish.review_quote_es, dish.review_quote_en),
      }
    default: {
      const _exhaustive: never = locale
      return _exhaustive
    }
  }
}

function useMobileLayout() {
  const [mobile, setMobile] = useState(() =>
    window.matchMedia(MOBILE_QUERY).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY)
    const sync = () => setMobile(media.matches)
    sync()
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', sync)
      return () => media.removeEventListener('change', sync)
    }
    media.addListener(sync)
    return () => media.removeListener(sync)
  }, [])

  return mobile
}

function DishBody({ dish, locale }: { dish: FeaturedDish; locale: Locale }) {
  const text = dishCopy(dish, locale)
  return (
    <>
      {dish.image_url ? (
        <img src={dish.image_url} alt="" loading="lazy" draggable={false} />
      ) : null}
      <div className="dish-meta">
        {showJapaneseCaption(locale) && dish.name_ja ? (
          <p className="dish-ja">{dish.name_ja}</p>
        ) : null}
        <h3>{text.name}</h3>
        {text.blurb ? <p>{text.blurb}</p> : null}
        {text.quote ? (
          <blockquote className="dish-quote">
            <p>{text.quote}</p>
            {dish.review_author ? (
              <footer>
                <cite>{dish.review_author}</cite>
              </footer>
            ) : null}
          </blockquote>
        ) : null}
      </div>
    </>
  )
}

function DishCarousel({
  dishes,
  locale,
}: {
  dishes: FeaturedDish[]
  locale: Locale
}) {
  const [index, setIndex] = useState(0)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
  } | null>(null)
  const labels = copy[locale]
  const count = dishes.length
  const activeIndex = count === 0 ? 0 : index % count
  const active = dishes[activeIndex]
  const showNav = count > 1

  const goPrev = () => {
    setIndex((current) => (current - 1 + count) % count)
  }
  const goNext = () => {
    setIndex((current) => (current + 1) % count)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }
    if (event.target instanceof Element && event.target.closest('button')) {
      return
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const finishDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    clientX: number,
    clientY: number,
  ) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    dragRef.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // already released
    }
    const dx = clientX - drag.startX
    const dy = clientY - drag.startY
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) {
      return
    }
    if (dx < 0) {
      goNext()
    } else {
      goPrev()
    }
  }

  if (!active) {
    return null
  }

  const name = dishCopy(active, locale).name

  return (
    <div className="dish-carousel" aria-roledescription="carousel" aria-label={labels.cartaTitle}>
      <div
        className="dish-card"
        onPointerDown={showNav ? onPointerDown : undefined}
        onPointerUp={
          showNav
            ? (event) => finishDrag(event, event.clientX, event.clientY)
            : undefined
        }
        onPointerCancel={() => {
          dragRef.current = null
        }}
      >
        <DishBody dish={active} locale={locale} />
        {showNav ? (
          <>
            <button
              type="button"
              className="ig-carousel-nav is-prev"
              onClick={goPrev}
              aria-label={labels.featuredPrev}
            >
              ‹
            </button>
            <button
              type="button"
              className="ig-carousel-nav is-next"
              onClick={goNext}
              aria-label={labels.featuredNext}
            >
              ›
            </button>
          </>
        ) : null}
      </div>
      {showNav ? (
        <div className="ig-carousel-dots" role="tablist" aria-label={labels.cartaTitle}>
          {dishes.map((dish, dishIndex) => (
            <button
              key={dish.id}
              type="button"
              role="tab"
              className={`ig-carousel-dot${dishIndex === activeIndex ? ' is-active' : ''}`}
              aria-selected={dishIndex === activeIndex}
              aria-label={dishCopy(dish, locale).name}
              onClick={() => setIndex(dishIndex)}
            />
          ))}
        </div>
      ) : null}
      <p className="visually-hidden" aria-live="polite">
        {name}
      </p>
    </div>
  )
}

export function FeaturedDishes({ locale }: { locale: Locale }) {
  const client = getSupabase()
  const mobile = useMobileLayout()
  const [dishes, setDishes] = useState<FeaturedDish[] | null>(() =>
    client ? null : [],
  )

  useEffect(() => {
    if (!client) {
      return undefined
    }
    const db = client
    let cancelled = false

    async function load() {
      const { data, error } = await db
        .from('yamachan_featured_dishes')
        .select(
          'id, slug, name_es, name_en, name_ja, blurb_es, blurb_en, image_url, review_quote_es, review_quote_en, review_author, sort_order',
        )
        .eq('published', true)
        .order('sort_order', { ascending: true })

      if (cancelled) {
        return
      }
      if (error || !data) {
        setDishes([])
        return
      }
      setDishes(data)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [client])

  if (dishes === null) {
    if (mobile) {
      return (
        <div className="dish-carousel" aria-busy="true">
          <div className="dish-card dish-card-skeleton" />
        </div>
      )
    }
    return (
      <ul className="dish-grid" aria-busy="true">
        {SKELETON_KEYS.map((key) => (
          <li key={key} className="dish-card dish-card-skeleton" />
        ))}
      </ul>
    )
  }

  if (dishes.length === 0) {
    return null
  }

  if (mobile) {
    return <DishCarousel dishes={dishes} locale={locale} />
  }

  return (
    <ul className="dish-grid">
      {dishes.map((dish) => (
        <li key={dish.id} className="dish-card">
          <DishBody dish={dish} locale={locale} />
        </li>
      ))}
    </ul>
  )
}
