import { useEffect, useState } from 'react'
import { getSupabase } from './supabase.ts'
import { showJapaneseCaption, type Locale } from './i18n/index.ts'
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
        name: firstNonEmpty(dish.name_ja, fromCatalog?.name, dish.name_es),
        blurb: firstNonEmpty(fromCatalog?.blurb, dish.blurb_en, dish.blurb_es),
        quote: firstNonEmpty(dish.review_quote_en, dish.review_quote_es),
      }
    case 'pt-BR':
      return {
        name: firstNonEmpty(fromCatalog?.name, dish.name_es, dish.name_en),
        blurb: firstNonEmpty(fromCatalog?.blurb, dish.blurb_es, dish.blurb_en),
        quote: firstNonEmpty(dish.review_quote_es, dish.review_quote_en),
      }
    default: {
      const _exhaustive: never = locale
      return _exhaustive
    }
  }
}

export function FeaturedDishes({ locale }: { locale: Locale }) {
  const client = getSupabase()
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

  return (
    <ul className="dish-grid">
      {dishes.map((dish) => {
        const copy = dishCopy(dish, locale)
        return (
          <li key={dish.id} className="dish-card">
            {dish.image_url ? (
              <img src={dish.image_url} alt="" loading="lazy" />
            ) : null}
            <div className="dish-meta">
              {showJapaneseCaption(locale) && dish.name_ja ? (
                <p className="dish-ja">{dish.name_ja}</p>
              ) : null}
              <h3>{copy.name}</h3>
              {copy.blurb ? <p>{copy.blurb}</p> : null}
              {copy.quote ? (
                <blockquote className="dish-quote">
                  <p>{copy.quote}</p>
                  {dish.review_author ? (
                    <footer>
                      <cite>{dish.review_author}</cite>
                    </footer>
                  ) : null}
                </blockquote>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
