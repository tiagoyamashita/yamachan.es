import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from 'react'
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
const DETAILS_KEY = 'yamachan-takeout-details'

type Cart = Record<string, number>
type TakeoutTab = 'menu' | 'order' | 'info' | 'send' | 'paid'
type SavedDetails = {
  name: string
  phone: string
  pickupDate: string | null
  pickupSlot: string
  notes: string
}
type PaidOrder = {
  paid: boolean
  name: string
  phone: string
  pickupDate: string
  pickupSlot: string
  notes: string
  amountTotal: number
  lines: { name: string; qty: number; amount: number }[]
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

function readDetails(): SavedDetails {
  try {
    const raw = sessionStorage.getItem(DETAILS_KEY)
    if (!raw) {
      return { name: '', phone: '', pickupDate: null, pickupSlot: '', notes: '' }
    }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return { name: '', phone: '', pickupDate: null, pickupSlot: '', notes: '' }
    }
    const row = parsed as Record<string, unknown>
    return {
      name: typeof row.name === 'string' ? row.name : '',
      phone: typeof row.phone === 'string' ? row.phone : '',
      pickupDate: typeof row.pickupDate === 'string' ? row.pickupDate : null,
      pickupSlot: typeof row.pickupSlot === 'string' ? row.pickupSlot : '',
      notes: typeof row.notes === 'string' ? row.notes : '',
    }
  } catch {
    return { name: '', phone: '', pickupDate: null, pickupSlot: '', notes: '' }
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
    case '#pagado':
      return 'paid'
    default:
      return 'menu'
  }
}

function sessionIdFromSearch(): string {
  return new URLSearchParams(window.location.search).get('session_id') ?? ''
}

function checkoutWasCanceled(): boolean {
  return new URLSearchParams(window.location.search).has('canceled')
}

function clearCheckoutSearch(hash = window.location.hash) {
  window.history.replaceState({}, '', `/para-llevar${hash}`)
}

type OrderLine = {
  item: StoredMenuItem
  qty: number
  copy: { name: string; blurb: string }
  unitCents: number
  lineTotalCents: number
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
  const [name, setName] = useState(() => readDetails().name)
  const [phone, setPhone] = useState(() => readDetails().phone)
  const [pickupDate, setPickupDate] = useState<string | null>(
    () => readDetails().pickupDate,
  )
  const [pickupSlot, setPickupSlot] = useState(() => readDetails().pickupSlot)
  const [notes, setNotes] = useState(() => readDetails().notes)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [paidOrder, setPaidOrder] = useState<PaidOrder | null>(null)
  const [canceledNotice] = useState(() => checkoutWasCanceled())
  const paidSessionId = tab === 'paid' ? sessionIdFromSearch() : ''
  const [paidLoading, setPaidLoading] = useState(() => Boolean(paidSessionId))

  useEffect(() => {
    sessionStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    sessionStorage.setItem(
      DETAILS_KEY,
      JSON.stringify({ name, phone, pickupDate, pickupSlot, notes }),
    )
  }, [name, notes, phone, pickupDate, pickupSlot])

  useEffect(() => {
    if (!canceledNotice) {
      return
    }
    clearCheckoutSearch('#enviar')
  }, [canceledNotice])

  useEffect(() => {
    if (tab !== 'paid' || !paidSessionId) {
      return
    }
    let cancelled = false
    void fetch(
      `/api/takeout/session?session_id=${encodeURIComponent(paidSessionId)}`,
    )
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null)
        if (!response.ok || !payload || typeof payload !== 'object') {
          throw new Error('session')
        }
        return payload as PaidOrder
      })
      .then((order) => {
        if (cancelled) {
          return
        }
        setPaidOrder(order)
        if (order.paid) {
          setCart({})
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(t.takeoutPayError)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPaidLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [paidSessionId, t.takeoutPayError, tab])

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

  const payOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (lines.length === 0) {
      setError(t.takeoutNeedItems)
      return
    }
    if (!name.trim() || !phone.trim()) {
      setError(t.takeoutNeedDetails)
      return
    }
    if (!pickupDate || !pickupSlot || !pickupLabel) {
      setError(t.takeoutNeedTime)
      return
    }

    setPaying(true)
    setError(null)
    try {
      const response = await fetch('/api/takeout/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines.map((line) => ({
            slug: line.item.slug,
            qty: line.qty,
          })),
          name: name.trim(),
          phone: phone.trim(),
          pickupDate,
          pickupSlot,
          notes: notes.trim(),
          locale,
        }),
      })
      const payload: unknown = await response.json().catch(() => null)
      const url =
        payload &&
        typeof payload === 'object' &&
        'url' in payload &&
        typeof payload.url === 'string'
          ? payload.url
          : ''
      if (!response.ok || !url) {
        throw new Error('checkout')
      }
      window.location.href = url
    } catch {
      setError(t.takeoutPayError)
      setPaying(false)
    }
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
            aria-selected={tab === 'send' || tab === 'paid'}
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
                                      <p className="carta-item-price">
                                        {money(item.price_cents)}
                                      </p>
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
                        {orderTotalCents > 0 ? (
                          <>
                            {' · '}
                            {money(orderTotalCents)}
                          </>
                        ) : null}
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

                      <form className="takeout-form" onSubmit={payOrder}>
                        <fieldset className="takeout-payment">
                          <legend>{t.takeoutPaymentLabel}</legend>
                          <p className="takeout-payment-option takeout-payment-card">
                            {t.takeoutPaymentCard}
                            <span>{t.takeoutPaymentCardOnly}</span>
                          </p>
                        </fieldset>
                        {error || (canceledNotice ? t.takeoutCanceled : null) ? (
                          <p className="takeout-error">
                            {error ?? t.takeoutCanceled}
                          </p>
                        ) : null}
                        <p className="takeout-pickup-note">
                          {t.takeoutPickupNote}
                        </p>
                        <button className="btn" type="submit" disabled={paying}>
                          {paying
                            ? t.takeoutPaying
                            : `${t.takeoutPayCard} · ${money(orderTotalCents)}`}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              )
            case 'paid':
              return (
                <div
                  role="tabpanel"
                  id="takeout-panel-send"
                  aria-labelledby="takeout-tab-send"
                >
                  {paidLoading ? (
                    <p className="muted">{t.cartaLoading}</p>
                  ) : paidOrder?.paid ? (
                    <>
                      <header className="section-head">
                        <h2>{t.takeoutPaidTitle}</h2>
                        <p className="lead muted">{t.takeoutPaidLead}</p>
                      </header>
                      <section className="takeout-send-summary">
                        <ul className="takeout-summary-list">
                          {paidOrder.lines.map((line, index) => (
                            <li key={`${line.name}-${index}`}>
                              <span>
                                {line.qty} × {line.name}
                              </span>
                              <span className="takeout-line-amount">
                                {money(line.amount)}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="takeout-totals">
                          <p className="takeout-totals-row">
                            <span>{t.takeoutTotalLabel}</span>
                            <strong>{money(paidOrder.amountTotal)}</strong>
                          </p>
                        </div>
                        <ul className="takeout-summary-list">
                          <li>
                            <span>{t.takeoutNameLabel}</span>
                            <span>{paidOrder.name || '—'}</span>
                          </li>
                          <li>
                            <span>{t.takeoutPhoneLabel}</span>
                            <span>{paidOrder.phone || '—'}</span>
                          </li>
                          {paidOrder.pickupDate && paidOrder.pickupSlot ? (
                            <li>
                              <span>{t.takeoutTimeLabel}</span>
                              <span>
                                {formatPickupLabel(
                                  locale,
                                  paidOrder.pickupDate,
                                  paidOrder.pickupSlot,
                                )}
                              </span>
                            </li>
                          ) : null}
                          {paidOrder.notes ? (
                            <li>
                              <span>{t.takeoutNotesLabel}</span>
                              <span>{paidOrder.notes}</span>
                            </li>
                          ) : null}
                          <li>
                            <span>{t.takeoutPaymentLabel}</span>
                            <span>{t.takeoutPaymentCard}</span>
                          </li>
                        </ul>
                      </section>
                      <p className="takeout-menu-cta">
                        <a
                          className="btn"
                          href="/para-llevar"
                          onClick={(event) => {
                            setPaidOrder(null)
                            setName('')
                            setPhone('')
                            setPickupDate(null)
                            setPickupSlot('')
                            setNotes('')
                            clearCheckoutSearch('')
                            onNavigate(event, '/para-llevar')
                          }}
                        >
                          {t.takeoutPaidNew}
                        </a>
                      </p>
                    </>
                  ) : (
                    <p className="takeout-error">
                      {error ?? t.takeoutPayError}
                    </p>
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
