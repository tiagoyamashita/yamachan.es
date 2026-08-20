import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from 'react'
import {
  menuCategories,
  restaurant,
  type Copy,
  type MenuCategoryId,
  type MenuItemId,
} from './content.ts'

const CART_KEY = 'yamachan-takeout-cart'

type Cart = Partial<Record<MenuItemId, number>>

type TakeoutTab = 'menu' | 'order'

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

function isMenuItemId(value: string): value is MenuItemId {
  return menuCategories.some((category) =>
    category.items.some((item) => item.id === value),
  )
}

function readCart(): Cart {
  try {
    const raw = sessionStorage.getItem(CART_KEY)
    if (!raw) {
      return {}
    }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }
    const next: Cart = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (isMenuItemId(key) && typeof value === 'number' && value > 0) {
        next[key] = Math.floor(value)
      }
    }
    return next
  } catch {
    return {}
  }
}

function tabFromHash(hash: string): TakeoutTab {
  return hash === '#pedido' ? 'order' : 'menu'
}

function QuantityControls({
  name,
  qty,
  addLabel,
  onChange,
}: {
  name: string
  qty: number
  addLabel: string
  onChange: (qty: number) => void
}) {
  if (qty <= 0) {
    return (
      <button
        type="button"
        className="takeout-add"
        onClick={() => onChange(1)}
      >
        {addLabel}
      </button>
    )
  }

  return (
    <div className="takeout-qty">
      <button
        type="button"
        aria-label={`− ${name}`}
        onClick={() => onChange(qty - 1)}
      >
        −
      </button>
      <span>{qty}</span>
      <button
        type="button"
        aria-label={`+ ${name}`}
        onClick={() => onChange(qty + 1)}
      >
        +
      </button>
    </div>
  )
}

export function TakeoutPage({
  t,
  hash,
  onHome,
  onNavigate,
}: {
  t: Copy
  hash: string
  onHome: (event: MouseEvent<HTMLAnchorElement>) => void
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
}) {
  const tab = tabFromHash(hash)
  const [cart, setCart] = useState<Cart>(readCart)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pickupTime, setPickupTime] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    sessionStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart])

  const setQty = (id: MenuItemId, qty: number) => {
    setCart((prev) => {
      const next = { ...prev }
      if (qty <= 0) {
        delete next[id]
      } else {
        next[id] = qty
      }
      return next
    })
    setError(null)
  }

  const lines = useMemo(() => {
    return menuCategories.flatMap((category) =>
      category.items.flatMap((item) => {
        const qty = cart[item.id] ?? 0
        if (qty <= 0) {
          return []
        }
        return [{ item, qty, copy: t.cartaItems[item.id] }]
      }),
    )
  }, [cart, t.cartaItems])

  const itemCount = lines.reduce((sum, line) => sum + line.qty, 0)

  const sendOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (lines.length === 0) {
      setError(t.takeoutNeedItems)
      return
    }
    if (!name.trim() || !phone.trim()) {
      setError(t.takeoutNeedDetails)
      return
    }

    const dishLines = lines.map(
      (line) => `- ${line.qty}× ${line.copy.name}`,
    )
    const extra: string[] = [
      '',
      `${t.takeoutWhatsappName}: ${name.trim()}`,
      `${t.takeoutWhatsappPhone}: ${phone.trim()}`,
    ]
    if (pickupTime.trim()) {
      extra.push(`${t.takeoutWhatsappTime}: ${pickupTime.trim()}`)
    }
    if (notes.trim()) {
      extra.push(`${t.takeoutWhatsappNotes}: ${notes.trim()}`)
    }

    const message = [t.takeoutWhatsappGreeting, '', ...dishLines, ...extra].join(
      '\n',
    )
    window.location.href = `https://wa.me/${restaurant.whatsappNumber}?text=${encodeURIComponent(message)}`
  }

  return (
    <article className="carta-page takeout-page" id="para-llevar">
      <div className="section-inner">
        <header className="section-head">
          <p className="kicker">{t.nav.takeout}</p>
          <h1>{t.takeoutPageHeading}</h1>
          <p className="lead muted">{t.takeoutPageLead}</p>
        </header>

        <div className="takeout-tabs" role="tablist" aria-label={t.nav.takeout}>
          <a
            className="takeout-tab"
            href="/para-llevar"
            role="tab"
            id="takeout-tab-menu"
            aria-selected={tab === 'menu'}
            aria-controls="takeout-panel-menu"
            onClick={(event) => onNavigate(event, '/para-llevar')}
          >
            {t.takeoutTabMenu}
          </a>
          <a
            className="takeout-tab"
            href="/para-llevar#pedido"
            role="tab"
            id="takeout-tab-order"
            aria-selected={tab === 'order'}
            aria-controls="takeout-panel-order"
            onClick={(event) => onNavigate(event, '/para-llevar#pedido')}
          >
            {t.takeoutTabOrder}
            {itemCount > 0 ? (
              <span className="takeout-badge">{itemCount}</span>
            ) : null}
          </a>
        </div>

        {(() => {
          switch (tab) {
            case 'menu':
              return (
                <div
                  role="tabpanel"
                  id="takeout-panel-menu"
                  aria-labelledby="takeout-tab-menu"
                >
                  {menuCategories.map((category) => (
                    <section
                      className="carta-section"
                      key={category.id}
                      aria-labelledby={`takeout-${category.id}`}
                    >
                      <h2 id={`takeout-${category.id}`}>
                        {categoryHeading(
                          category.id,
                          t.cartaCategories[category.id],
                        )}
                      </h2>
                      <ul className="carta-list">
                        {category.items.map((item) => {
                          const copy = t.cartaItems[item.id]
                          const qty = cart[item.id] ?? 0
                          return (
                            <li
                              key={item.id}
                              className={
                                item.image
                                  ? 'carta-item carta-item-photo'
                                  : 'carta-item'
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
                                  <div>
                                    <h3>{copy.name}</h3>
                                    <p className="dish-ja">{item.nameJa}</p>
                                  </div>
                                  <QuantityControls
                                    name={copy.name}
                                    qty={qty}
                                    addLabel={t.takeoutAdd}
                                    onChange={(next) => setQty(item.id, next)}
                                  />
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
                  {itemCount > 0 ? (
                    <p className="takeout-menu-cta">
                      <a
                        className="btn"
                        href="/para-llevar#pedido"
                        onClick={(event) =>
                          onNavigate(event, '/para-llevar#pedido')
                        }
                      >
                        {t.takeoutTabOrder}
                        {' · '}
                        {itemCount}
                      </a>
                    </p>
                  ) : null}
                </div>
              )
            case 'order':
              return (
                <div
                  role="tabpanel"
                  id="takeout-panel-order"
                  aria-labelledby="takeout-tab-order"
                >
                  {lines.length === 0 ? (
                    <p className="takeout-empty">
                      {t.takeoutEmptyOrder}{' '}
                      <a
                        href="/para-llevar"
                        onClick={(event) => onNavigate(event, '/para-llevar')}
                      >
                        {t.takeoutSeeMenu}
                      </a>
                    </p>
                  ) : (
                    <>
                      <ul className="takeout-order-list">
                        {lines.map((line) => (
                          <li key={line.item.id} className="takeout-order-line">
                            <div>
                              <h3>{line.copy.name}</h3>
                              <p className="dish-ja">{line.item.nameJa}</p>
                            </div>
                            <QuantityControls
                              name={line.copy.name}
                              qty={line.qty}
                              addLabel={t.takeoutAdd}
                              onChange={(next) => setQty(line.item.id, next)}
                            />
                          </li>
                        ))}
                      </ul>

                      <form className="takeout-form" onSubmit={sendOrder}>
                        <label className="takeout-field">
                          <span>{t.takeoutNameLabel}</span>
                          <input
                            type="text"
                            name="name"
                            autoComplete="name"
                            value={name}
                            onChange={(event) => {
                              setName(event.target.value)
                              setError(null)
                            }}
                          />
                        </label>
                        <label className="takeout-field">
                          <span>{t.takeoutPhoneLabel}</span>
                          <input
                            type="tel"
                            name="phone"
                            autoComplete="tel"
                            value={phone}
                            onChange={(event) => {
                              setPhone(event.target.value)
                              setError(null)
                            }}
                          />
                        </label>
                        <label className="takeout-field">
                          <span>{t.takeoutTimeLabel}</span>
                          <input
                            type="text"
                            name="pickupTime"
                            placeholder={t.takeoutTimePlaceholder}
                            value={pickupTime}
                            onChange={(event) =>
                              setPickupTime(event.target.value)
                            }
                          />
                        </label>
                        <label className="takeout-field">
                          <span>{t.takeoutNotesLabel}</span>
                          <textarea
                            name="notes"
                            rows={3}
                            placeholder={t.takeoutNotesPlaceholder}
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                          />
                        </label>
                        {error ? <p className="takeout-error">{error}</p> : null}
                        <p className="takeout-pickup-note">
                          {t.takeoutPickupNote}
                        </p>
                        <button className="btn" type="submit">
                          {t.takeoutSendWhatsapp}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              )
            default: {
              const _exhaustive: never = tab
              return _exhaustive
            }
          }
        })()}

        <p className="carta-back">
          <a href="/" onClick={onHome}>
            {t.cartaBackHome}
          </a>
        </p>
      </div>
    </article>
  )
}
