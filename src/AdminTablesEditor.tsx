import { useMemo, useState } from 'react'
import { WEEKDAY_LABELS_ES } from './companyInfo.ts'
import type { Copy } from './i18n/index.ts'

const OPEN_TAB_STATUSES = ['open', 'submitted', 'preparing', 'served'] as const

export type TablesSubtab = 'today' | 'history'

export type AdminTableRow = {
  id: string
  label: string
  seat_count: number
  is_active: boolean
  kind: string
}

export type TableOrderRow = {
  id: string
  tableId: string | null
  status: string
  created_at: string
  submitted_at: string | null
  orderNumber: string
  items: Array<{
    id: string
    item_name: string
    quantity: number
    unit_price_cents: number
    line_notes: string | null
    status: string
  }>
}

export type GbMenuItemRow = {
  id: string
  name: string
  price_cents: number | null
  is_available: boolean
  sort_order: number
}

type CartLine = {
  menu_item_id: string
  name: string
  quantity: number
  line_notes: string
}

function shiftMonth(year: number, month: number, delta: number) {
  const next = new Date(year, month + delta, 1)
  return { year: next.getFullYear(), month: next.getMonth() }
}

function dateKeyFromIso(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

function todayKeyInTimeZone(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now)
}

function tableOrderMadeAtIso(order: TableOrderRow): string {
  return order.submitted_at ?? order.created_at
}

function tableOrderDateKey(order: TableOrderRow, timeZone: string): string {
  return dateKeyFromIso(tableOrderMadeAtIso(order), timeZone)
}

function sortTableOrdersNewestFirst(orders: TableOrderRow[]): TableOrderRow[] {
  return orders.slice().sort((left, right) => {
    const leftMs = new Date(tableOrderMadeAtIso(left)).getTime()
    const rightMs = new Date(tableOrderMadeAtIso(right)).getTime()
    return rightMs - leftMs
  })
}

function formatHistoryDateLabel(dateKey: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${dateKey}T12:00:00`))
}

function formatMoney(cents: number | null): string {
  if (cents === null || cents <= 0) {
    return '—'
  }
  return `${(cents / 100).toFixed(2)} €`
}

function orderStatusLabel(t: Copy, status: string): string {
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
    default:
      return status
  }
}

function itemStatusLabel(t: Copy, status: string): string {
  switch (status) {
    case 'pending':
      return t.adminOrdersItemPending
    case 'preparing':
      return t.adminOrdersStatusPreparing
    case 'served':
      return t.adminOrdersStatusServed
    default:
      return status
  }
}

function TableOrdersList({
  orders,
  tableId,
  busy,
  editable,
  t,
  onCancelOrder,
  onRemoveItem,
}: {
  orders: TableOrderRow[]
  tableId: string
  busy: boolean
  editable: boolean
  t: Copy
  onCancelOrder: (orderId: string) => void
  onRemoveItem: (tableId: string, orderId: string, itemId: string) => void
}) {
  if (orders.length === 0) {
    return <p className="muted">{t.adminTablesNoOrders}</p>
  }

  return (
    <ul className="admin-orders-list admin-tables-orders">
      {orders.map((order) => {
        const canCancel = editable &&
          ['open', 'submitted', 'preparing', 'served'].includes(order.status)
        return (
          <li key={order.id} className="admin-order-card">
            <header className="admin-order-head">
              <div>
                <p className="admin-order-number">
                  {t.adminOrdersNumberLabel} #{order.orderNumber}
                </p>
                <p className="admin-order-meta">{orderStatusLabel(t, order.status)}</p>
              </div>
              {canCancel ? (
                <button
                  type="button"
                  className="btn btn-outline btn-small"
                  disabled={busy}
                  onClick={() => onCancelOrder(order.id)}
                >
                  {t.adminTablesCancelOrder}
                </button>
              ) : null}
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
                    {item.line_notes ? (
                      <p className="muted">{item.line_notes}</p>
                    ) : null}
                  </div>
                  {editable && item.status === 'pending' && canCancel ? (
                    <button
                      type="button"
                      className="btn btn-outline btn-small"
                      disabled={busy}
                      onClick={() => onRemoveItem(tableId, order.id, item.id)}
                    >
                      {t.adminTablesRemoveItem}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        )
      })}
    </ul>
  )
}

export function AdminTablesEditor({
  tables,
  orders,
  menuItems,
  subtab,
  timeZone,
  historyYear,
  historyMonth,
  historySelectedDate,
  selectedTableId,
  busy,
  loadError,
  t,
  onSubtabChange,
  onHistoryMonthChange,
  onHistorySelectDate,
  onSelectTable,
  onRefresh,
  onSubmitOrder,
  onCancelOrder,
  onRemoveItem,
  onCloseTab,
}: {
  tables: AdminTableRow[]
  orders: TableOrderRow[]
  menuItems: GbMenuItemRow[]
  subtab: TablesSubtab
  timeZone: string
  historyYear: number
  historyMonth: number
  historySelectedDate: string | null
  selectedTableId: string | null
  busy: boolean
  loadError: string | null
  t: Copy
  onSubtabChange: (subtab: TablesSubtab) => void
  onHistoryMonthChange: (year: number, month: number) => void
  onHistorySelectDate: (date: string) => void
  onSelectTable: (tableId: string | null) => void
  onRefresh: () => void
  onSubmitOrder: (
    tableId: string,
    items: Array<{ menu_item_id: string; quantity: number; line_notes?: string }>,
  ) => void
  onCancelOrder: (orderId: string) => void
  onRemoveItem: (tableId: string, orderId: string, itemId: string) => void
  onCloseTab: (tableId: string, paymentMethod: string) => void
}) {
  const [ordering, setOrdering] = useState(false)
  const [cart, setCart] = useState<CartLine[]>([])
  const [orderNotes, setOrderNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'other'>('cash')

  const today = todayKeyInTimeZone(timeZone)
  const editable = subtab === 'today'
  const activeDate = subtab === 'today' ? today : historySelectedDate

  const ordersByTable = useMemo(() => {
    const map = new Map<string, TableOrderRow[]>()
    for (const order of orders) {
      if (!order.tableId) {
        continue
      }
      const list = map.get(order.tableId) ?? []
      list.push(order)
      map.set(order.tableId, list)
    }
    return map
  }, [orders])

  const orderCountByDate = useMemo(() => {
    const map = new Map<string, number>()
    for (const order of orders) {
      const key = tableOrderDateKey(order, timeZone)
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [orders, timeZone])

  const ordersForActiveDate = useMemo(() => {
    if (!activeDate) {
      return []
    }
    return orders.filter((order) => tableOrderDateKey(order, timeZone) === activeDate)
  }, [orders, activeDate, timeZone])

  const visibleTables = useMemo(() => {
    if (subtab === 'today') {
      return tables
    }
    if (!historySelectedDate) {
      return []
    }
    const tableIds = new Set(
      ordersForActiveDate
        .map((order) => order.tableId)
        .filter((id): id is string => Boolean(id)),
    )
    return tables.filter((table) => tableIds.has(table.id))
  }, [tables, subtab, historySelectedDate, ordersForActiveDate])

  const selectedTable = tables.find((table) => table.id === selectedTableId) ?? null
  const tableOrders = selectedTableId
    ? sortTableOrdersNewestFirst(
        (ordersByTable.get(selectedTableId) ?? []).filter((order) =>
          activeDate ? tableOrderDateKey(order, timeZone) === activeDate : false,
        ),
      )
    : []
  const openOrders = tableOrders.filter((order) =>
    OPEN_TAB_STATUSES.includes(order.status as (typeof OPEN_TAB_STATUSES)[number]),
  )
  const availableMenu = menuItems
    .filter((item) => item.is_available)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))

  const historyDateLabel = historySelectedDate
    ? formatHistoryDateLabel(historySelectedDate)
    : null
  const firstWeekday = new Date(historyYear, historyMonth, 1).getDay()
  const daysInMonth = new Date(historyYear, historyMonth + 1, 0).getDate()
  const calendarCells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(historyYear, historyMonth, 1))

  const resetOrdering = () => {
    setOrdering(false)
    setCart([])
    setOrderNotes('')
  }

  const addToCart = (item: GbMenuItemRow) => {
    setCart((current) => {
      const existing = current.find((line) => line.menu_item_id === item.id)
      if (existing) {
        return current.map((line) =>
          line.menu_item_id === item.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        )
      }
      return [
        ...current,
        {
          menu_item_id: item.id,
          name: item.name,
          quantity: 1,
          line_notes: orderNotes.trim(),
        },
      ]
    })
  }

  const setCartQty = (menuItemId: string, quantity: number) => {
    setCart((current) => {
      if (quantity < 1) {
        return current.filter((line) => line.menu_item_id !== menuItemId)
      }
      return current.map((line) =>
        line.menu_item_id === menuItemId ? { ...line, quantity } : line,
      )
    })
  }

  if (loadError === 'not-configured') {
    return (
      <section className="admin-company takeout-form">
        <p className="takeout-error">{t.adminTablesNotConfigured}</p>
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
        <legend>{t.adminTablesHeading}</legend>
        <p className="muted">{t.adminTablesLead}</p>
        <div className="admin-orders-toolbar">
          <div className="admin-subtabs" role="tablist" aria-label={t.adminTablesHeading}>
            <button
              type="button"
              role="tab"
              className={`admin-tab${subtab === 'today' ? ' is-active' : ''}`}
              aria-selected={subtab === 'today'}
              onClick={() => {
                onSubtabChange('today')
                resetOrdering()
              }}
            >
              {t.adminTablesTabToday}
            </button>
            <button
              type="button"
              role="tab"
              className={`admin-tab${subtab === 'history' ? ' is-active' : ''}`}
              aria-selected={subtab === 'history'}
              onClick={() => {
                onSubtabChange('history')
                resetOrdering()
              }}
            >
              {t.adminTablesTabHistory}
            </button>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-small"
            disabled={busy}
            onClick={onRefresh}
          >
            {t.adminOrdersRefresh}
          </button>
        </div>

        {subtab === 'history' ? (
          <>
            <div className="admin-availability-cal-head">
              <button
                type="button"
                className="btn btn-outline btn-small"
                aria-label={t.adminCalendarPrevMonth}
                disabled={busy}
                onClick={() => {
                  const next = shiftMonth(historyYear, historyMonth, -1)
                  onHistoryMonthChange(next.year, next.month)
                }}
              >
                ‹
              </button>
              <p>{monthLabel}</p>
              <button
                type="button"
                className="btn btn-outline btn-small"
                aria-label={t.adminCalendarNextMonth}
                disabled={busy}
                onClick={() => {
                  const next = shiftMonth(historyYear, historyMonth, 1)
                  onHistoryMonthChange(next.year, next.month)
                }}
              >
                ›
              </button>
            </div>
            <div className="admin-availability-grid admin-bookings-grid" role="grid">
              {WEEKDAY_LABELS_ES.map((label) => (
                <div className="admin-availability-dow" key={`tables-${label}`}>
                  {label.slice(0, 2)}
                </div>
              ))}
              {calendarCells.map((day, index) => {
                if (day === null) {
                  return (
                    <div
                      className="admin-availability-cell is-empty"
                      key={`tables-empty-${index}`}
                    />
                  )
                }
                const key = `${historyYear}-${String(historyMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const count = orderCountByDate.get(key) ?? 0
                const hasOrders = count > 0
                const selected = historySelectedDate === key
                return (
                  <button
                    type="button"
                    className={`admin-availability-cell${hasOrders ? ' is-booked' : ''}${selected ? ' is-selected' : ''}`}
                    key={key}
                    disabled={busy}
                    aria-pressed={selected}
                    onClick={() => onHistorySelectDate(key)}
                  >
                    <span>{day}</span>
                    <small>{hasOrders ? String(count) : '·'}</small>
                  </button>
                )
              })}
            </div>
          </>
        ) : null}

        {subtab === 'today' ? (
          tables.length === 0 ? (
            <p className="muted">{t.adminTablesEmpty}</p>
          ) : (
            <div className="admin-tables-grid">
              {tables.map((table) => {
                const dayOrders = (ordersByTable.get(table.id) ?? []).filter(
                  (order) => tableOrderDateKey(order, timeZone) === today,
                )
                const tableOpen = dayOrders.filter((order) =>
                  OPEN_TAB_STATUSES.includes(
                    order.status as (typeof OPEN_TAB_STATUSES)[number],
                  ),
                )
                const selected = selectedTableId === table.id
                return (
                  <button
                    key={table.id}
                    type="button"
                    className={`admin-table-card${selected ? ' is-selected' : ''}${tableOpen.length > 0 ? ' has-orders' : ''}`}
                    disabled={busy}
                    onClick={() => {
                      onSelectTable(table.id)
                      resetOrdering()
                    }}
                  >
                    <strong>{table.label}</strong>
                    <span className="muted">
                      {t.adminTablesSeats.replace('{count}', String(table.seat_count))}
                    </span>
                    {dayOrders.length > 0 ? (
                      <span className="admin-table-badge">
                        {t.adminTablesOrdersToday.replace(
                          '{count}',
                          String(dayOrders.length),
                        )}
                      </span>
                    ) : null}
                    {tableOpen.length > 0 ? (
                      <span className="admin-table-badge">
                        {t.adminTablesOpenOrders.replace(
                          '{count}',
                          String(tableOpen.length),
                        )}
                      </span>
                    ) : null}
                    {!table.is_active ? (
                      <span className="admin-table-badge is-inactive">
                        {t.adminTablesInactive}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )
        ) : !historySelectedDate ? (
          <p className="muted">{t.adminTablesPickDate}</p>
        ) : visibleTables.length === 0 ? (
          <p className="muted">{t.adminTablesEmptyHistory}</p>
        ) : (
          <div className="admin-tables-grid">
            {visibleTables.map((table) => {
              const dayOrders = (ordersByTable.get(table.id) ?? []).filter(
                (order) => tableOrderDateKey(order, timeZone) === historySelectedDate,
              )
              const selected = selectedTableId === table.id
              return (
                <button
                  key={table.id}
                  type="button"
                  className={`admin-table-card${selected ? ' is-selected' : ''}${dayOrders.length > 0 ? ' has-orders' : ''}`}
                  disabled={busy}
                  onClick={() => {
                    onSelectTable(table.id)
                    resetOrdering()
                  }}
                >
                  <strong>{table.label}</strong>
                  <span className="muted">
                    {t.adminTablesSeats.replace('{count}', String(table.seat_count))}
                  </span>
                  <span className="admin-table-badge">
                    {t.adminTablesOrdersToday.replace('{count}', String(dayOrders.length))}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </fieldset>

      {selectedTable ? (
        <fieldset className="admin-company-block">
          <legend>
            {subtab === 'history' && historyDateLabel
              ? `${t.adminTablesForDate} ${historyDateLabel} · ${selectedTable.label}`
              : t.adminTablesDetail.replace('{label}', selectedTable.label)}
          </legend>

          {editable && !ordering ? (
            <div className="admin-tables-actions">
              <button
                type="button"
                className="btn btn-small"
                disabled={busy || !selectedTable.is_active}
                onClick={() => setOrdering(true)}
              >
                {openOrders.length > 0 ? t.adminTablesAddItems : t.adminTablesStartOrder}
              </button>
              {openOrders.length > 0 ? (
                <div className="admin-tables-close-tab">
                  <label className="takeout-field admin-tables-payment">
                    <span>{t.adminTablesPaymentMethod}</span>
                    <select
                      value={paymentMethod}
                      disabled={busy}
                      onChange={(event) =>
                        setPaymentMethod(
                          event.target.value as 'cash' | 'card' | 'other',
                        )
                      }
                    >
                      <option value="cash">{t.adminTablesPayCash}</option>
                      <option value="card">{t.adminTablesPayCard}</option>
                      <option value="other">{t.adminTablesPayOther}</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn btn-outline btn-small"
                    disabled={busy}
                    onClick={() => onCloseTab(selectedTable.id, paymentMethod)}
                  >
                    {t.adminTablesCloseTab}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {editable && ordering ? (
            <div className="admin-tables-ordering">
              <p className="muted">{t.adminTablesOrderingLead}</p>
              {availableMenu.length === 0 ? (
                <p className="muted">{t.adminTablesNoMenu}</p>
              ) : (
                <ul className="admin-tables-menu">
                  {availableMenu.map((item) => (
                    <li key={item.id} className="admin-tables-menu-item">
                      <div>
                        <strong>{item.name}</strong>
                        <span className="muted">{formatMoney(item.price_cents)}</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline btn-small"
                        disabled={busy}
                        onClick={() => addToCart(item)}
                      >
                        {t.adminTablesAddDish}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="takeout-field">
                <span>{t.adminTablesOrderNotes}</span>
                <input
                  type="text"
                  value={orderNotes}
                  disabled={busy}
                  onChange={(event) => setOrderNotes(event.target.value)}
                />
              </label>
              {cart.length > 0 ? (
                <ul className="admin-tables-cart">
                  {cart.map((line) => (
                    <li key={line.menu_item_id} className="admin-tables-cart-line">
                      <span>{line.name}</span>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={line.quantity}
                        disabled={busy}
                        onChange={(event) =>
                          setCartQty(line.menu_item_id, Number(event.target.value) || 1)
                        }
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="admin-dish-actions">
                <button
                  type="button"
                  className="btn"
                  disabled={busy || cart.length === 0}
                  onClick={() => {
                    onSubmitOrder(
                      selectedTable.id,
                      cart.map((line) => ({
                        menu_item_id: line.menu_item_id,
                        quantity: line.quantity,
                        line_notes: orderNotes.trim() || undefined,
                      })),
                    )
                    resetOrdering()
                  }}
                >
                  {t.adminTablesSendOrder}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={busy}
                  onClick={resetOrdering}
                >
                  {t.adminTablesCancelOrdering}
                </button>
              </div>
            </div>
          ) : null}

          <TableOrdersList
            orders={tableOrders}
            tableId={selectedTable.id}
            busy={busy}
            editable={editable}
            t={t}
            onCancelOrder={onCancelOrder}
            onRemoveItem={onRemoveItem}
          />
        </fieldset>
      ) : subtab === 'today' ? (
        <fieldset className="admin-company-block">
          <legend>{t.adminTablesPickTable}</legend>
          <p className="muted">{t.adminTablesPickTable}</p>
        </fieldset>
      ) : historySelectedDate ? (
        <fieldset className="admin-company-block">
          <legend>
            {historyDateLabel
              ? `${t.adminTablesForDate} ${historyDateLabel}`
              : t.adminTablesPickDate}
          </legend>
          <p className="muted">{t.adminTablesPickTable}</p>
        </fieldset>
      ) : null}
    </section>
  )
}
