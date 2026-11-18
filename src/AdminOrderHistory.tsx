import { useMemo, useState } from 'react'
import { WEEKDAY_LABELS_ES } from './companyInfo.ts'
import { type Copy, formatEuros, type Locale } from './i18n/index.ts'

type OrderHistoryItemStatus = 'pending' | 'preparing' | 'served'
type OrderHistoryStatus =
  | 'open'
  | 'submitted'
  | 'preparing'
  | 'served'
  | 'closed'
  | 'cancelled'

export type OrderHistoryItem = {
  id: string
  item_name: string
  quantity: number
  unit_price_cents: number
  line_notes: string | null
  status: OrderHistoryItemStatus
}

export type OrderHistoryOrder = {
  id: string
  status: OrderHistoryStatus
  created_at: string
  submitted_at: string | null
  tableLabel: string | null
  orderNumber: string
  items: OrderHistoryItem[]
}

function orderMadeAtIso(order: OrderHistoryOrder): string {
  return order.submitted_at ?? order.created_at
}

function dateKeyFromIso(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

function shiftMonth(year: number, month: number, delta: number) {
  const next = new Date(year, month + delta, 1)
  return { year: next.getFullYear(), month: next.getMonth() }
}

function todayParts(timeZone: string): { year: number; month: number } {
  const key = new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())
  const [yearText, monthText] = key.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  }
  return { year, month: month - 1 }
}

function formatDayLabel(dateKey: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${dateKey}T12:00:00`))
}

function formatOrderTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function orderStatusLabel(t: Copy, status: OrderHistoryStatus): string {
  switch (status) {
    case 'open':
      return t.adminOrdersStatusOpen
    case 'submitted':
      return t.adminOrdersStatusSubmitted
    case 'preparing':
      return t.adminOrdersStatusPreparing
    case 'served':
      return t.adminOrdersStatusServed
    case 'closed':
      return t.adminOrdersStatusClosed
    case 'cancelled':
      return t.adminOrdersStatusCancelled
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

function itemStatusLabel(t: Copy, status: OrderHistoryItemStatus): string {
  switch (status) {
    case 'pending':
      return t.adminOrdersItemPending
    case 'preparing':
      return t.adminOrdersStatusPreparing
    case 'served':
      return t.adminOrdersStatusServed
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

function orderTotalCents(order: OrderHistoryOrder): number {
  return order.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price_cents,
    0,
  )
}

function orderMatches(order: OrderHistoryOrder, query: string, t: Copy): boolean {
  if (!query) {
    return true
  }
  const haystack = [
    order.orderNumber,
    order.tableLabel ?? '',
    orderStatusLabel(t, order.status),
    ...order.items.flatMap((item) => [
      item.item_name,
      item.line_notes ?? '',
      itemStatusLabel(t, item.status),
    ]),
  ]
    .join(' ')
    .toLocaleLowerCase()
  return haystack.includes(query)
}

export function AdminOrderHistory({
  orders,
  timeZone,
  locale,
  busy,
  loadError,
  t,
  onRefresh,
}: {
  orders: OrderHistoryOrder[]
  timeZone: string
  locale: Locale
  busy: boolean
  loadError: string | null
  t: Copy
  onRefresh: () => void
}) {
  const [search, setSearch] = useState('')
  const [visibleMonth, setVisibleMonth] = useState(() => todayParts(timeZone))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const query = search.trim().toLocaleLowerCase()
  const orderCountByDate = useMemo(() => {
    const counts = new Map<string, number>()
    for (const order of orders) {
      const key = dateKeyFromIso(orderMadeAtIso(order), timeZone)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [orders, timeZone])
  const dayOrders = useMemo(() => {
    if (!selectedDate) {
      return []
    }
    return orders
      .filter((order) => dateKeyFromIso(orderMadeAtIso(order), timeZone) === selectedDate)
      .filter((order) => orderMatches(order, query, t))
      .sort(
        (left, right) =>
          new Date(orderMadeAtIso(right)).getTime() - new Date(orderMadeAtIso(left)).getTime(),
      )
  }, [orders, query, selectedDate, t, timeZone])

  if (loadError === 'not-configured') {
    return (
      <section className="admin-company takeout-form">
        <p className="takeout-error">{t.adminOrdersNotConfigured}</p>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="admin-company takeout-form">
        <p className="takeout-error">{loadError}</p>
      </section>
    )
  }

  const { year, month } = visibleMonth
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const calendarCells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month, 1))
  const selectedLabel = selectedDate ? formatDayLabel(selectedDate) : null

  return (
    <section className="admin-company takeout-form">
      <fieldset className="admin-company-block">
        <legend>{t.adminOrderHistoryHeading}</legend>
        <p className="muted">{t.adminOrderHistoryLead}</p>
        <div className="admin-order-history-toolbar">
          <label className="takeout-field admin-order-history-search">
            <span>{t.adminOrderHistorySearch}</span>
            <input
              type="search"
              value={search}
              disabled={busy}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn btn-outline btn-small"
            disabled={busy}
            onClick={onRefresh}
          >
            {t.adminOrdersRefresh}
          </button>
        </div>
        <div className="admin-availability-cal-head">
          <button
            type="button"
            className="btn btn-outline btn-small"
            aria-label={t.adminCalendarPrevMonth}
            disabled={busy}
            onClick={() => setVisibleMonth((current) => shiftMonth(current.year, current.month, -1))}
          >
            ‹
          </button>
          <p>{monthLabel}</p>
          <button
            type="button"
            className="btn btn-outline btn-small"
            aria-label={t.adminCalendarNextMonth}
            disabled={busy}
            onClick={() => setVisibleMonth((current) => shiftMonth(current.year, current.month, 1))}
          >
            ›
          </button>
        </div>
        <div className="admin-availability-grid admin-bookings-grid" role="grid">
          {WEEKDAY_LABELS_ES.map((label) => (
            <div className="admin-availability-dow" key={`history-${label}`}>
              {label.slice(0, 2)}
            </div>
          ))}
          {calendarCells.map((day, index) => {
            if (day === null) {
              return <div className="admin-availability-cell is-empty" key={`history-empty-${index}`} />
            }
            const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const count = orderCountByDate.get(key) ?? 0
            const hasOrders = count > 0
            const selected = selectedDate === key
            return (
              <button
                type="button"
                className={`admin-availability-cell${hasOrders ? ' is-booked' : ''}${selected ? ' is-selected' : ''}`}
                key={key}
                disabled={busy}
                aria-pressed={selected}
                onClick={() => setSelectedDate(key)}
              >
                <span>{day}</span>
                <small>{hasOrders ? String(count) : '·'}</small>
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="admin-company-block">
        <legend>
          {selectedLabel ? `${t.adminOrdersForDate} ${selectedLabel}` : t.adminOrdersPickDate}
        </legend>
        {!selectedDate ? (
          <p className="muted">{t.adminOrdersPickDate}</p>
        ) : orders.every((order) => dateKeyFromIso(orderMadeAtIso(order), timeZone) !== selectedDate) ? (
          <p className="muted">{t.adminOrdersEmptyHistory}</p>
        ) : dayOrders.length === 0 ? (
          <p className="muted">{t.adminOrderHistoryNoMatches}</p>
        ) : (
          <ul className="admin-orders-list">
            {dayOrders.map((order) => (
              <li key={order.id} className="admin-order-card">
                <header className="admin-order-head">
                  <div>
                    <p className="admin-order-number">
                      {t.adminOrdersNumberLabel} #{order.orderNumber}
                    </p>
                    <p className="admin-order-meta">
                      {formatOrderTime(orderMadeAtIso(order), timeZone)}
                      {' · '}
                      {order.tableLabel
                        ? `${t.adminOrdersTableLabel} ${order.tableLabel}`
                        : t.adminOrdersNoTable}
                      {' · '}
                      {orderStatusLabel(t, order.status)}
                    </p>
                  </div>
                </header>
                <ul className="admin-order-items">
                  {order.items.map((item) => (
                    <li key={item.id} className="admin-order-item">
                      <div className="admin-order-item-copy">
                        <strong>
                          {item.quantity}× {item.item_name}
                        </strong>
                        <span className={`admin-order-item-status is-${item.status}`}>
                          {itemStatusLabel(t, item.status)}
                        </span>
                        {item.line_notes ? <p className="muted">{item.line_notes}</p> : null}
                      </div>
                      <span className="muted">
                        {formatEuros(item.quantity * item.unit_price_cents, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="admin-order-total">
                  {t.adminOrderHistoryTotal} {formatEuros(orderTotalCents(order), locale)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
    </section>
  )
}
