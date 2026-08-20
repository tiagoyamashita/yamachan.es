import { type MouseEvent } from 'react'
import {
  menuCategories,
  type Copy,
  type MenuCategoryId,
} from './content.ts'

function categoryHeading(id: MenuCategoryId, label: string): string {
  switch (id) {
    case 'starters':
    case 'sushi':
    case 'mains':
    case 'dessert':
    case 'drinks':
      return label
    default: {
      const _exhaustive: never = id
      return _exhaustive
    }
  }
}

export function CartaPage({
  t,
  onHome,
}: {
  t: Copy
  onHome: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  return (
    <article className="carta-page" id="carta">
      <div className="section-inner">
        <header className="section-head">
          <p className="kicker">{t.cartaEyebrow}</p>
          <h1>{t.cartaPageHeading}</h1>
          <p className="lead muted">{t.cartaPageLead}</p>
        </header>

        {menuCategories.map((category) => (
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
                const copy = t.cartaItems[item.id]
                return (
                  <li
                    key={item.id}
                    className={
                      item.image ? 'carta-item carta-item-photo' : 'carta-item'
                    }
                  >
                    {item.image ? (
                      <img
                        className="carta-item-img"
                        src={item.image}
                        alt=""
                        loading="lazy"
                      />
                    ) : null}
                    <div className="carta-item-body">
                      <div className="carta-item-head">
                        <h3>{copy.name}</h3>
                        <p className="dish-ja">{item.nameJa}</p>
                      </div>
                      <p>{copy.blurb}</p>
                      {item.vegetarian ? (
                        <p className="carta-veg">{t.cartaVegLabel}</p>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}

        <p className="veg-note">{t.cartaVegNote}</p>
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
