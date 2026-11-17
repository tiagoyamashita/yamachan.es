import { useEffect, useMemo, useRef, useState } from 'react'
import { WEEKDAY_LABELS_ES } from './companyInfo.ts'
import { AdminTabBar } from './AdminTabBar.tsx'
import type { Copy } from './i18n/index.ts'
import {
  categoryHeading,
  isMenuCategoryId,
  MENU_CATEGORY_IDS,
  resolveTableMenuCategory,
} from './menu.ts'

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
  category?: string | null
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

function DishQtyControl({
  name,
  qty,
  busy,
  addLabel,
  fewerLabel,
  moreLabel,
  onChange,
}: {
  name: string
  qty: number
  busy: boolean
  addLabel: string
  fewerLabel: string
  moreLabel: string
  onChange: (qty: number) => void
}) {
  if (qty <= 0) {
    return (
      <button
        type="button"
        className="btn btn-outline btn-small"
        disabled={busy}
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
        aria-label={`${fewerLabel} ${name}`}
        disabled={busy}
        onClick={() => onChange(qty - 1)}
      >
        −
      </button>
      <span>{qty}</span>
      <button
        type="button"
        aria-label={`${moreLabel} ${name}`}
        disabled={busy || qty >= 99}
        onClick={() => onChange(qty + 1)}
      >
        +
      </button>
    </div>
  )
}

function tableMenuGroupLabel(t: Copy, groupId: string): string {
  if (isMenuCategoryId(groupId)) {
    return categoryHeading(groupId, t.cartaCategories[groupId])
  }
  if (groupId === 'other') {
    return t.adminTablesOtherCategory
  }
  return groupId
}

function groupTableMenu(
  items: GbMenuItemRow[],
  t: Copy,
): Array<{ id: string; label: string; items: GbMenuItemRow[] }> {
  const buckets = new Map<string, GbMenuItemRow[]>()
  for (const item of items) {
    const key = resolveTableMenuCategory(item.name, item.category ?? null)
    const list = buckets.get(key) ?? []
    list.push(item)
    buckets.set(key, list)
  }

  const groups: Array<{ id: string; label: string; items: GbMenuItemRow[] }> = []
  for (const id of MENU_CATEGORY_IDS) {
    const grouped = buckets.get(id)
    if (!grouped?.length) {
      continue
    }
    groups.push({ id, label: tableMenuGroupLabel(t, id), items: grouped })
    buckets.delete(id)
  }

  const extras = [...buckets.entries()]
    .filter(([id]) => id !== 'other')
    .sort((left, right) => left[0].localeCompare(right[0]))
  for (const [id, grouped] of extras) {
    groups.push({ id, label: tableMenuGroupLabel(t, id), items: grouped })
  }

  const other = buckets.get('other')
  if (other?.length) {
    groups.push({
      id: 'other',
      label: tableMenuGroupLabel(t, 'other'),
      items: other,
    })
  }
  return groups
}

function normalizeMenuSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function menuItemMatchesQuery(name: string, groupLabel: string, query: string): boolean {
  const needle = normalizeMenuSearch(query.trim())
  if (!needle) {
    return true
  }
  return (
    normalizeMenuSearch(name).includes(needle) ||
    normalizeMenuSearch(groupLabel).includes(needle)
  )
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
  emptyLabel,
}: {
  orders: TableOrderRow[]
  tableId: string
  busy: boolean
  editable: boolean
  t: Copy
  onCancelOrder: (orderId: string) => void
  onRemoveItem: (tableId: string, orderId: string, itemId: string) => void
  emptyLabel: string
}) {
  if (orders.length === 0) {
    return <p className="muted">{emptyLabel}</p>
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
  const [menuQuery, setMenuQuery] = useState('')
  const [openMenuGroupIds, setOpenMenuGroupIds] = useState<Set<string>>(() => new Set())
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'other'>('cash')
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    panelRef.current?.scrollIntoView({ block: 'start' })
  }, [selectedTableId])

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
  const menuQueryTrimmed = menuQuery.trim()
  const menuGroups = groupTableMenu(availableMenu, t)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        menuItemMatchesQuery(item.name, group.label, menuQueryTrimmed),
      ),
    }))
    .filter((group) => group.items.length > 0)
  const cartQty = (menuItemId: string) =>
    cart.find((line) => line.menu_item_id === menuItemId)?.quantity ?? 0

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
    setMenuQuery('')
    setOpenMenuGroupIds(new Set())
  }

  const setItemQty = (item: GbMenuItemRow, quantity: number) => {
    setCart((current) => {
      if (quantity < 1) {
        return current.filter((line) => line.menu_item_id !== item.id)
      }
      const existing = current.find((line) => line.menu_item_id === item.id)
      if (existing) {
        return current.map((line) =>
          line.menu_item_id === item.id ? { ...line, quantity } : line,
        )
      }
      return [
        ...current,
        {
          menu_item_id: item.id,
          name: item.name,
          quantity,
          line_notes: orderNotes.trim(),
        },
      ]
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
    <section ref={panelRef} className="admin-company takeout-form">
      {!selectedTable ? (
      <fieldset className="admin-company-block">
        <legend>{t.adminTablesHeading}</legend>
        <p className="muted">{t.adminTablesLead}</p>
        <div className="admin-orders-toolbar">
          <AdminTabBar
            variant="subtabs"
            value={subtab}
            ariaLabel={t.adminTablesHeading}
            options={[
              { id: 'today', label: t.adminTablesTabToday },
              { id: 'history', label: t.adminTablesTabHistory },
            ]}
            onChange={(next) => {
              onSubtabChange(next)
              resetOrdering()
            }}
          />
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
      ) : (
        <fieldset className="admin-company-block">
          <legend>
            {subtab === 'history' && historyDateLabel
              ? `${t.adminTablesForDate} ${historyDateLabel} · ${selectedTable.label}`
              : t.adminTablesDetail.replace('{label}', selectedTable.label)}
          </legend>
          <button
            type="button"
            className="btn btn-outline btn-small admin-tables-back"
            disabled={busy}
            onClick={() => {
              onSelectTable(null)
              resetOrdering()
            }}
          >
            {t.adminTablesBack}
          </button>

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
              {availableMenu.length > 0 || cart.length > 0 ? (
                <div className="admin-tables-ordering-bar">
                  {availableMenu.length > 0 ? (
                    <label className="takeout-field admin-tables-menu-search">
                      <span className="visually-hidden">{t.adminTablesMenuSearch}</span>
                      <input
                        type="search"
                        value={menuQuery}
                        placeholder={t.adminTablesMenuSearch}
                        aria-label={t.adminTablesMenuSearch}
                        disabled={busy}
                        onChange={(event) => setMenuQuery(event.target.value)}
                      />
                    </label>
                  ) : null}
                  {cart.length > 0 ? (
                    <div className="admin-tables-current">
                      <h3>{t.adminTablesCurrentOrder}</h3>
                      <ul className="admin-tables-cart">
                        {cart.map((line) => {
                          const menuItem =
                            availableMenu.find((item) => item.id === line.menu_item_id) ?? {
                              id: line.menu_item_id,
                              name: line.name,
                              price_cents: null,
                              is_available: true,
                              sort_order: 0,
                              category: null,
                            }
                          return (
                            <li key={line.menu_item_id} className="admin-tables-cart-line">
                              <span>
                                {line.name}
                                {menuItem.price_cents ? (
                                  <span className="muted">
                                    {' '}
                                    {formatMoney(menuItem.price_cents)}
                                  </span>
                                ) : null}
                              </span>
                              <DishQtyControl
                                name={line.name}
                                qty={line.quantity}
                                busy={busy}
                                addLabel={t.adminTablesAddDish}
                                fewerLabel={t.adminTablesFewerDish}
                                moreLabel={t.adminTablesMoreDish}
                                onChange={(qty) => setItemQty(menuItem, qty)}
                              />
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {availableMenu.length === 0 ? (
                <p className="muted">{t.adminTablesNoMenu}</p>
              ) : menuGroups.length === 0 ? (
                <p className="muted">{t.adminTablesMenuSearchEmpty}</p>
              ) : (
                <div className="admin-tables-menu-groups">
                  {menuGroups.map((group) => {
                    const groupOpen = menuQueryTrimmed.length > 0 || openMenuGroupIds.has(group.id)
                    return (
                      <details
                        key={group.id}
                        className="admin-tables-menu-group"
                        open={groupOpen}
                        onToggle={(event) => {
                          if (menuQueryTrimmed) {
                            event.currentTarget.open = true
                            return
                          }
                          const isOpen = event.currentTarget.open
                          setOpenMenuGroupIds((current) => {
                            const next = new Set(current)
                            if (isOpen) {
                              next.add(group.id)
                            } else {
                              next.delete(group.id)
                            }
                            return next
                          })
                        }}
                      >
                        <summary>
                          {group.label}
                          <span className="admin-tables-menu-group-count">{group.items.length}</span>
                        </summary>
                        <ul className="admin-tables-menu">
                          {group.items.map((item) => (
                            <li key={item.id} className="admin-tables-menu-item">
                              <div>
                                <strong>{item.name}</strong>
                                <span className="muted">{formatMoney(item.price_cents)}</span>
                              </div>
                              <DishQtyControl
                                name={item.name}
                                qty={cartQty(item.id)}
                                busy={busy}
                                addLabel={t.adminTablesAddDish}
                                fewerLabel={t.adminTablesFewerDish}
                                moreLabel={t.adminTablesMoreDish}
                                onChange={(qty) => setItemQty(item, qty)}
                              />
                            </li>
                          ))}
                        </ul>
                      </details>
                    )
                  })}
                </div>
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
            orders={editable ? openOrders : tableOrders}
            tableId={selectedTable.id}
            busy={busy}
            editable={editable}
            t={t}
            emptyLabel={editable ? t.adminTablesNoOpenOrders : t.adminTablesNoOrders}
            onCancelOrder={onCancelOrder}
            onRemoveItem={onRemoveItem}
          />
        </fieldset>
      )}
    </section>
  )
}
