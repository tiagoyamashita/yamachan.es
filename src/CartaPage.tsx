import { type MouseEvent } from 'react'
import { AllergenLegend, AllergenMarks } from './AllergenIcon.tsx'
import { romajiForMenuSlug } from './content.ts'
import { type Copy, formatEuros, type Locale, showJapaneseCaption } from './i18n/index.ts'
import {
  categoryHeading,
  displayMenuItem,
  groupMenuByCategory,
} from './menu.ts'
import { usePublishedMenu } from './usePublishedMenu.ts'

export function CartaPage({
  t,
  locale,
  onHome,
}: {
  t: Copy
  locale: Locale
  onHome: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  const items = usePublishedMenu()
  const categories = items ? groupMenuByCategory(items) : []
  const vegNames = (items ?? [])
    .filter((item) => item.vegetarian)
    .map((item) => displayMenuItem(item, locale).name)

  return (
    <article className="carta-page" id="carta">
      <div className="section-inner">
        <header className="section-head">
          <p className="kicker">{t.cartaEyebrow}</p>
          <h1>{t.cartaPageHeading}</h1>
          <p className="lead muted">{t.cartaPageLead}</p>
        </header>

        {items === null ? (
          <p className="muted">{t.cartaLoading}</p>
        ) : (
          categories.map((category) => (
            <section
              className="carta-section"
              key={category.id}
              aria-labelledby={`carta-${category.id}`}
            >
              <h2 id={`carta-${category.id}`}>
                {categoryHeading(category.id, t.cartaCategories[category.id])}
              </h2>
              <ul className="carta-list">
                {category.items.map((item) => {
                  const shown = displayMenuItem(item, locale)
                  const romaji = romajiForMenuSlug(item.slug)
                  return (
                    <li
                      key={item.id}
                      className={
                        item.image_url
                          ? 'carta-item carta-item-photo'
                          : 'carta-item'
                      }
                    >
                      {item.image_url ? (
                        <img
                          className="carta-item-img"
                          src={item.image_url}
                          alt=""
                          loading="lazy"
                        />
                      ) : null}
                      <div className="carta-item-body">
                        <div className="carta-item-head">
                          <div>
                            <h3>{shown.name}</h3>
                            {showJapaneseCaption(locale) && item.name_ja ? (
                              <p className="dish-ja">
                                {romaji ? (
                                  <ruby lang="ja">
                                    {item.name_ja}
                                    <rt lang="ja-Latn">{romaji}</rt>
                                  </ruby>
                                ) : (
                                  item.name_ja
                                )}
                              </p>
                            ) : null}
                          </div>
                          {item.price_cents > 0 ? (
                            <p className="carta-item-price">
                              {formatEuros(item.price_cents, locale)}
                            </p>
                          ) : null}
                        </div>
                        <p>{shown.blurb}</p>
                        {item.vegetarian ? (
                          <p className="carta-veg">{t.cartaVegLabel}</p>
                        ) : null}
                        <AllergenMarks
                          ids={item.allergens}
                          names={t.cartaAllergens}
                          label={t.cartaAllergenLabel}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}

        {vegNames.length > 0 ? (
          <p className="veg-note">
            {t.cartaVegNotePrefix} {vegNames.join(', ')}.
          </p>
        ) : null}
        <AllergenLegend names={t.cartaAllergens} label={t.cartaAllergenLabel} />
        <p className="carta-allergen-note">{t.cartaAllergenNote}</p>
        <p className="carta-price-note">{t.cartaPageNote}</p>
        <p className="carta-back">
          <a href="/" onClick={onHome}>
            {t.cartaBackHome}
          </a>
        </p>
      </div>
    </article>
  )
}
