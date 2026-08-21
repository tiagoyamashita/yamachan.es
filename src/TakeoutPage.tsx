import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from 'react'
import { restaurant } from './content.ts'
import { AllergenLegend, AllergenMarks } from './AllergenIcon.tsx'
import { type Copy, formatEuros, type Locale, showJapaneseCaption } from './i18n/index.ts'
import {
  categoryHeading,
  displayMenuItem,
  groupMenuByCategory,
  type StoredMenuItem,
} from './menu.ts'
import { PickupCalendar } from './PickupCalendar.tsx'
import { formatPickupLabel } from './openingHours.ts'
import { usePublishedMenu } from './usePublishedMenu.ts'

const CART_KEY = 'yamachan-takeout-cart'
const PAYMENT_METHODS = ['cash', 'card', 'bizum'] as const

type Cart = Record<string, number>
type TakeoutTab = 'menu' | 'order' | 'info' | 'send'
type PaymentMethod = (typeof PAYMENT_METHODS)[number]
type OrderLine = {
  item: StoredMenuItem
  qty: number
  copy: { name: string; blurb: string }
  unitCents: number
  lineTotalCents: number
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
      if (typeof value === 'number' && value > 0) {
        next[key] = Math.floor(value)
      }
    }
    return next
  } catch {
    return {}
  }
}

function tabFromHash(hash: string): TakeoutTab {
  switch (hash) {
    case '#pedido':
      return 'order'
    case '#datos':
      return 'info'
    case '#enviar':
      return 'send'
    default:
      return 'menu'
  }
}

function paymentLabel(method: PaymentMethod, t: Copy): string {
  switch (method) {
    case 'cash':
      return t.takeoutPaymentCash
    case 'card':
      return t.takeoutPaymentCard
    case 'bizum':
      return t.takeoutPaymentBizum
    default: {
      const _exhaustive: never = method
      return _exhaustive
    }
  }
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

function EmptyOrder({
  t,
  onNavigate,
}: {
  t: Copy
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
}) {
  return (
    <p className="takeout-empty">
      {t.takeoutEmptyOrder}{' '}
      <a
        href="/para-llevar"
        onClick={(event) => onNavigate(event, '/para-llevar')}
      >
        {t.takeoutSeeMenu}
      </a>
    </p>
  )
}

export function TakeoutPage({
  t,
  locale,
  hash,
  onHome,
  onNavigate,
}: {
  t: Copy
  locale: Locale
  hash: string
  onHome: (event: MouseEvent<HTMLAnchorElement>) => void
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
}) {
  const tab = tabFromHash(hash)
  const menuItems = usePublishedMenu()
  const categories = menuItems ? groupMenuByCategory(menuItems) : []
  const [cart, setCart] = useState<Cart>(readCart)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pickupDate, setPickupDate] = useState<string | null>(null)
  const [pickupSlot, setPickupSlot] = useState('')
  const [notes, setNotes] = useState('')
  const [payment, setPayment] = useState<PaymentMethod>('cash')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    sessionStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart])

  const setQty = (id: string, qty: number) => {
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

  const lines = useMemo((): OrderLine[] => {
    if (!menuItems) {
      return []
    }
    return menuItems.flatMap((item) => {
      const qty = cart[item.slug] ?? 0
      if (qty <= 0) {
        return []
      }
      const unitCents = item.price_cents
      return [
        {
          item,
          qty,
          copy: displayMenuItem(item, locale),
          unitCents,
          lineTotalCents: unitCents * qty,
        },
      ]
    })
  }, [cart, locale, menuItems])

  const itemCount = lines.reduce((sum, line) => sum + line.qty, 0)
  const orderTotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0)

  const money = (cents: number) =>
    cents > 0 ? formatEuros(cents, locale) : t.takeoutTotalPending
  const pickupLabel =
    pickupDate && pickupSlot
      ? formatPickupLabel(locale, pickupDate, pickupSlot)
      : ''

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
    if (!pickupLabel) {
      setError(t.takeoutNeedTime)
      return
    }

    const dishLines = lines.map(
      (line) =>
        `- ${line.qty}× ${line.copy.name} — ${money(line.lineTotalCents)}`,
    )
    const extra: string[] = [
      '',
      `${t.takeoutWhatsappTotal}: ${money(orderTotalCents)}`,
      `${t.takeoutWhatsappPayment}: ${paymentLabel(payment, t)}`,
      `${t.takeoutWhatsappName}: ${name.trim()}`,
      `${t.takeoutWhatsappPhone}: ${phone.trim()}`,
    ]
    extra.push(`${t.takeoutWhatsappTime}: ${pickupLabel}`)
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
          <a
            className="takeout-tab"
            href="/para-llevar#datos"
            role="tab"
            id="takeout-tab-info"
            aria-selected={tab === 'info'}
            aria-controls="takeout-panel-info"
            onClick={(event) => onNavigate(event, '/para-llevar#datos')}
          >
            {t.takeoutTabInfo}
          </a>
          <a
            className="takeout-tab"
            href="/para-llevar#enviar"
            role="tab"
            id="takeout-tab-send"
            aria-selected={tab === 'send'}
            aria-controls="takeout-panel-send"
            onClick={(event) => onNavigate(event, '/para-llevar#enviar')}
          >
            {t.takeoutTabSend}
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
                  {menuItems === null ? (
                    <p className="muted">{t.cartaLoading}</p>
                  ) : (
                    categories.map((category) => (
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
                            const shown = displayMenuItem(item, locale)
                            const qty = cart[item.slug] ?? 0
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
                                      {showJapaneseCaption(locale) &&
                                      item.name_ja ? (
                                        <p className="dish-ja">{item.name_ja}</p>
                                      ) : null}
                                    </div>
                                    <QuantityControls
                                      name={shown.name}
                                      qty={qty}
                                      addLabel={t.takeoutAdd}
                                      onChange={(next) =>
                                        setQty(item.slug, next)
                                      }
                                    />
                                  </div>
                                  <p>{shown.blurb}</p>
                                  {item.vegetarian ? (
                                    <p className="carta-veg">
                                      {t.cartaVegLabel}
                                    </p>
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
                  <AllergenLegend
                    names={t.cartaAllergens}
                    label={t.cartaAllergenLabel}
                  />
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
                    <EmptyOrder t={t} onNavigate={onNavigate} />
                  ) : (
                    <>
                      <ul className="takeout-order-list">
                        {lines.map((line) => (
                          <li key={line.item.id} className="takeout-order-line">
                            <div>
                              <h3>{line.copy.name}</h3>
                              {showJapaneseCaption(locale) &&
                              line.item.name_ja ? (
                                <p className="dish-ja">{line.item.name_ja}</p>
                              ) : null}
                              <p className="takeout-line-price">
                                {line.qty} × {money(line.unitCents)}
                              </p>
                            </div>
                            <div className="takeout-order-line-end">
                              <QuantityControls
                                name={line.copy.name}
                                qty={line.qty}
                                addLabel={t.takeoutAdd}
                                onChange={(next) =>
                                  setQty(line.item.slug, next)
                                }
                              />
                              <p className="takeout-line-amount">
                                {t.takeoutItemTotalLabel}{' '}
                                {money(line.lineTotalCents)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="takeout-totals">
                        <p className="takeout-totals-row">
                          <span>{t.takeoutTotalLabel}</span>
                          <strong>{money(orderTotalCents)}</strong>
                        </p>
                        <p className="takeout-tax-note">{t.takeoutTaxNote}</p>
                      </div>
                      <p className="takeout-menu-cta">
                        <a
                          className="btn"
                          href="/para-llevar#datos"
                          onClick={(event) =>
                            onNavigate(event, '/para-llevar#datos')
                          }
                        >
                          {t.takeoutContinueToInfo}
                        </a>
                      </p>
                    </>
                  )}
                </div>
              )
            case 'info':
              return (
                <div
                  role="tabpanel"
                  id="takeout-panel-info"
                  aria-labelledby="takeout-tab-info"
                >
                  {lines.length === 0 ? (
                    <EmptyOrder t={t} onNavigate={onNavigate} />
                  ) : (
                    <div className="takeout-form">
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
                      <PickupCalendar
                        t={t}
                        locale={locale}
                        selectedDate={pickupDate}
                        selectedTime={pickupSlot}
                        onSelect={(date, time) => {
                          setPickupDate(date)
                          setPickupSlot(time)
                          setError(null)
                        }}
                      />
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
                      <p className="takeout-menu-cta">
                        <a
                          className="btn"
                          href="/para-llevar#enviar"
                          onClick={(event) => {
                            if (!name.trim() || !phone.trim()) {
                              event.preventDefault()
                              setError(t.takeoutNeedDetails)
                              return
                            }
                            if (!pickupDate || !pickupSlot) {
                              event.preventDefault()
                              setError(t.takeoutNeedTime)
                              return
                            }
                            onNavigate(event, '/para-llevar#enviar')
                          }}
                        >
                          {t.takeoutContinueToSend}
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              )
            case 'send':
              return (
                <div
                  role="tabpanel"
                  id="takeout-panel-send"
                  aria-labelledby="takeout-tab-send"
                >
                  {lines.length === 0 ? (
                    <EmptyOrder t={t} onNavigate={onNavigate} />
                  ) : (
                    <>
                      <section className="takeout-send-summary">
                        <div className="takeout-send-summary-head">
                          <h2>{t.takeoutSummaryTitle}</h2>
                          <a
                            href="/para-llevar#pedido"
                            onClick={(event) =>
                              onNavigate(event, '/para-llevar#pedido')
                            }
                          >
                            {t.takeoutEditOrder}
                          </a>
                        </div>
                        <ul className="takeout-summary-list">
                          {lines.map((line) => (
                            <li key={line.item.id}>
                              <span>
                                {line.qty} × {line.copy.name}
                              </span>
                              <span className="takeout-line-amount">
                                {money(line.lineTotalCents)}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="takeout-totals">
                          <p className="takeout-totals-row">
                            <span>{t.takeoutTotalLabel}</span>
                            <strong>{money(orderTotalCents)}</strong>
                          </p>
                          <p className="takeout-tax-note">{t.takeoutTaxNote}</p>
                        </div>
                      </section>

                      <section className="takeout-send-summary">
                        <div className="takeout-send-summary-head">
                          <h2>{t.takeoutTabInfo}</h2>
                          <a
                            href="/para-llevar#datos"
                            onClick={(event) =>
                              onNavigate(event, '/para-llevar#datos')
                            }
                          >
                            {t.takeoutEditInfo}
                          </a>
                        </div>
                        <ul className="takeout-summary-list">
                          <li>
                            <span>{t.takeoutNameLabel}</span>
                            <span>{name.trim() || '—'}</span>
                          </li>
                          <li>
                            <span>{t.takeoutPhoneLabel}</span>
                            <span>{phone.trim() || '—'}</span>
                          </li>
                          {pickupLabel ? (
                            <li>
                              <span>{t.takeoutTimeLabel}</span>
                              <span>{pickupLabel}</span>
                            </li>
                          ) : null}
                          {notes.trim() ? (
                            <li>
                              <span>{t.takeoutNotesLabel}</span>
                              <span>{notes.trim()}</span>
                            </li>
                          ) : null}
                        </ul>
                      </section>

                      <form className="takeout-form" onSubmit={sendOrder}>
                        <fieldset className="takeout-payment">
                          <legend>{t.takeoutPaymentLabel}</legend>
                          {PAYMENT_METHODS.map((method) => (
                            <label key={method} className="takeout-payment-option">
                              <input
                                type="radio"
                                name="payment"
                                value={method}
                                checked={payment === method}
                                onChange={() => setPayment(method)}
                              />
                              <span>{paymentLabel(method, t)}</span>
                            </label>
                          ))}
                        </fieldset>
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
