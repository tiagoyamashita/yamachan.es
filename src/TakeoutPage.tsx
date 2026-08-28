import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from 'react'
import { AllergenLegend, AllergenMarks } from './AllergenIcon.tsx'
import { scheduleFromCompanyInfo } from './companyInfo.ts'
import { type Copy, formatEuros, type Locale, showJapaneseCaption } from './i18n/index.ts'
import {
  categoryHeading,
  displayMenuItem,
  groupMenuByCategory,
  type StoredMenuItem,
} from './menu.ts'
import { PickupCalendar } from './PickupCalendar.tsx'
import {
  formatPickupLabel,
  pickupSlotsForDate,
  todayKey,
} from './openingHours.ts'
import {
  DEFAULT_TAKEOUT_CATALOG,
  parseTakeoutCatalog,
  takeoutOfferMaxQty,
  type TakeoutCatalog,
} from './takeoutCatalog.ts'
import { TakeoutClosedPage } from './TakeoutClosedPage.tsx'
import { useCompanyInfo } from './useCompanyInfo.ts'
import { usePublishedMenu } from './usePublishedMenu.ts'

const CART_KEY = 'yamachan-takeout-cart'
const DETAILS_KEY = 'yamachan-takeout-details'

type Cart = Record<string, number>
type TakeoutTab = 'menu' | 'order' | 'info' | 'send' | 'paid'
type SavedDetails = {
  name: string
  email: string
  phone: string
  pickupDate: string | null
  pickupSlot: string
  notes: string
}
type PaidOrder = {
  paid: boolean
  name: string
  email: string
  phone: string
  pickupDate: string
  pickupSlot: string
  notes: string
  amountTotal: number
  lines: { name: string; qty: number; amount: number }[]
}

function emptyDetails(): SavedDetails {
  return {
    name: '',
    email: '',
    phone: '',
    pickupDate: todayKey(),
    pickupSlot: '',
    notes: '',
  }
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
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
  const empty = emptyDetails()
  try {
    const raw = sessionStorage.getItem(DETAILS_KEY)
    if (!raw) {
      return empty
    }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return empty
    }
    const row = parsed as Record<string, unknown>
    return {
      name: typeof row.name === 'string' ? row.name : '',
      email: typeof row.email === 'string' ? row.email : '',
      phone: typeof row.phone === 'string' ? row.phone : '',
      pickupDate: todayKey(),
      pickupSlot: typeof row.pickupSlot === 'string' ? row.pickupSlot : '',
      notes: typeof row.notes === 'string' ? row.notes : '',
    }
  } catch {
    return empty
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
  maxQty,
  addLabel,
  onChange,
}: {
  name: string
  qty: number
  maxQty: number
  addLabel: string
  onChange: (qty: number) => void
}) {
  if (maxQty < 1) {
    return null
  }

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
        disabled={qty >= maxQty}
        onClick={() => onChange(Math.min(maxQty, qty + 1))}
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
  const companyInfo = useCompanyInfo()
  const schedule = useMemo(
    () => scheduleFromCompanyInfo(companyInfo),
    [companyInfo],
  )
  const [catalog, setCatalog] = useState<TakeoutCatalog | null>(null)
  const [catalogError, setCatalogError] = useState(false)
  const takeoutItems = useMemo(() => {
    if (!menuItems || !catalog) {
      return null
    }
    if (!catalog.enabled) {
      return []
    }
    return menuItems.filter((item) => takeoutOfferMaxQty(catalog, item.slug) > 0)
  }, [catalog, menuItems])
  const categories = takeoutItems ? groupMenuByCategory(takeoutItems) : []
  const [cart, setCart] = useState<Cart>(readCart)
  const [name, setName] = useState(() => readDetails().name)
  const [email, setEmail] = useState(() => readDetails().email)
  const [phone, setPhone] = useState(() => readDetails().phone)
  const [pickupSlot, setPickupSlot] = useState(() => readDetails().pickupSlot)
  const [notes, setNotes] = useState(() => readDetails().notes)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [paidOrder, setPaidOrder] = useState<PaidOrder | null>(null)
  const [canceledNotice] = useState(() => checkoutWasCanceled())
  const paidSessionId = tab === 'paid' ? sessionIdFromSearch() : ''
  const [paidLoading, setPaidLoading] = useState(() => Boolean(paidSessionId))
  const pickupDate = todayKey()
  const todaySlots = pickupSlotsForDate(pickupDate, new Date(), schedule)
  const selectedSlot = todaySlots.includes(pickupSlot) ? pickupSlot : ''

  useEffect(() => {
    sessionStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    let cancelled = false
    void fetch('/api/takeout/catalog')
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null)
        if (!response.ok || !payload || typeof payload !== 'object') {
          throw new Error('catalog')
        }
        return parseTakeoutCatalog((payload as { catalog?: unknown }).catalog)
      })
      .then((next) => {
        if (!cancelled) {
          setCatalog(next)
          setCatalogError(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog({ ...DEFAULT_TAKEOUT_CATALOG })
          setCatalogError(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!catalog) {
      return
    }
    setCart((prev) => {
      let changed = false
      const next: Cart = {}
      for (const [slug, qty] of Object.entries(prev)) {
        const maxQty = takeoutOfferMaxQty(catalog, slug)
        if (maxQty < 1) {
          changed = true
          continue
        }
        const capped = Math.min(qty, maxQty)
        if (capped !== qty) {
          changed = true
        }
        next[slug] = capped
      }
      return changed ? next : prev
    })
  }, [catalog])

  useEffect(() => {
    sessionStorage.setItem(
      DETAILS_KEY,
      JSON.stringify({
        name,
        email,
        phone,
        pickupDate,
        pickupSlot: selectedSlot,
        notes,
      }),
    )
  }, [email, name, notes, phone, pickupDate, selectedSlot])

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
    const maxQty = catalog ? takeoutOfferMaxQty(catalog, id) : 0
    setCart((prev) => {
      const next = { ...prev }
      const capped = Math.min(Math.max(0, qty), maxQty)
      if (capped <= 0) {
        delete next[id]
      } else {
        next[id] = capped
      }
      return next
    })
    setError(null)
  }

  const lines = useMemo((): OrderLine[] => {
    if (!takeoutItems) {
      return []
    }
    return takeoutItems.flatMap((item) => {
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
  }, [cart, locale, takeoutItems])

  const itemCount = lines.reduce((sum, line) => sum + line.qty, 0)
  const orderTotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0)

  const money = (cents: number) =>
    cents > 0 ? formatEuros(cents, locale) : t.takeoutTotalPending
  const pickupLabel = selectedSlot
    ? formatPickupLabel(locale, pickupDate, selectedSlot)
    : ''

  const payOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (lines.length === 0) {
      setError(t.takeoutNeedItems)
      return
    }
    if (!name.trim() || !phone.trim() || !email.trim()) {
      setError(t.takeoutNeedDetails)
      return
    }
    if (!isEmail(email)) {
      setError(t.takeoutNeedEmail)
      return
    }
    if (!selectedSlot || !pickupLabel) {
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
          email: email.trim(),
          phone: phone.trim(),
          pickupDate,
          pickupSlot: selectedSlot,
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

  if (catalog === null) {
    return (
      <article className="carta-page takeout-page" id="para-llevar">
        <div className="section-inner">
          <header className="section-head">
            <p className="kicker">{t.nav.takeout}</p>
            <h1>{t.takeoutPageHeading}</h1>
          </header>
          <p className="muted">{t.cartaLoading}</p>
          <p className="carta-back">
            <a href="/" onClick={onHome}>
              {t.cartaBackHome}
            </a>
          </p>
        </div>
      </article>
    )
  }

  if (!catalog.enabled) {
    return (
      <TakeoutClosedPage t={t} onHome={onHome} onNavigate={onNavigate} />
    )
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
                  ) : categories.length === 0 ? (
                    <p className="muted">{t.takeoutNoItems}</p>
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
                            const maxQty = takeoutOfferMaxQty(catalog, item.slug)
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
                                      maxQty={maxQty}
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
                  {catalogError ? (
                    <p className="muted">{t.takeoutCatalogFallback}</p>
                  ) : null}
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
                                maxQty={
                                  catalog
                                    ? takeoutOfferMaxQty(catalog, line.item.slug)
                                    : line.qty
                                }
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
                          required
                          value={name}
                          onChange={(event) => {
                            setName(event.target.value)
                            setError(null)
                          }}
                        />
                      </label>
                      <label className="takeout-field">
                        <span>{t.takeoutEmailLabel}</span>
                        <input
                          type="email"
                          name="email"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(event) => {
                            setEmail(event.target.value)
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
                          required
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
                        selectedTime={selectedSlot}
                        schedule={schedule}
                        onSelect={(_date, time) => {
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
                            if (!name.trim() || !phone.trim() || !email.trim()) {
                              event.preventDefault()
                              setError(t.takeoutNeedDetails)
                              return
                            }
                            if (!isEmail(email)) {
                              event.preventDefault()
                              setError(t.takeoutNeedEmail)
                              return
                            }
                            if (!selectedSlot) {
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
                            <span>{t.takeoutEmailLabel}</span>
                            <span>{email.trim() || '—'}</span>
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
                            <span>{t.takeoutEmailLabel}</span>
                            <span>{paidOrder.email || '—'}</span>
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
                            setEmail('')
                            setPhone('')
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
