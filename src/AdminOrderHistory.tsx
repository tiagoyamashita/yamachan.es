import { useMemo, useState } from 'react'
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

function groupByDay(orders: OrderHistoryOrder[], timeZone: string) {
  const sorted = orders.slice().sort((left, right) => {
    return new Date(orderMadeAtIso(right)).getTime() - new Date(orderMadeAtIso(left)).getTime()
  })
  const groups = new Map<string, OrderHistoryOrder[]>()
  for (const order of sorted) {
    const key = dateKeyFromIso(orderMadeAtIso(order), timeZone)
    const list = groups.get(key) ?? []
    list.push(order)
    groups.set(key, list)
  }
  return [...groups.entries()].map(([date, items]) => ({ date, items }))
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

  const query = search.trim().toLocaleLowerCase()
  const groups = useMemo(
    () => groupByDay(orders.filter((order) => orderMatches(order, query, t)), timeZone),
    [orders, query, t, timeZone],
  )

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
        {orders.length === 0 ? (
          <p className="muted">{t.adminOrderHistoryEmpty}</p>
        ) : groups.length === 0 ? (
          <p className="muted">{t.adminOrderHistoryNoMatches}</p>
        ) : (
          groups.map((group) => (
            <div key={group.date}>
              <h2 className="admin-order-history-day">{formatDayLabel(group.date)}</h2>
              <ul className="admin-orders-list">
                {group.items.map((order) => (
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
                      {t.adminOrderHistoryTotal}{' '}
                      {formatEuros(orderTotalCents(order), locale)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </fieldset>
    </section>
  )
}
