import { useMemo, useState } from 'react'
import type { Copy } from './i18n/index.ts'

const OPEN_TAB_STATUSES = ['open', 'submitted', 'preparing', 'served'] as const

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

export function AdminTablesEditor({
  tables,
  orders,
  menuItems,
  selectedTableId,
  busy,
  loadError,
  t,
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
  selectedTableId: string | null
  busy: boolean
  loadError: string | null
  t: Copy
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

  const selectedTable = tables.find((table) => table.id === selectedTableId) ?? null
  const tableOrders = selectedTableId ? (ordersByTable.get(selectedTableId) ?? []) : []
  const openOrders = tableOrders.filter((order) =>
    OPEN_TAB_STATUSES.includes(order.status as (typeof OPEN_TAB_STATUSES)[number]),
  )
  const availableMenu = menuItems
    .filter((item) => item.is_available)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))

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
          <button
            type="button"
            className="btn btn-outline btn-small"
            disabled={busy}
            onClick={onRefresh}
          >
            {t.adminOrdersRefresh}
          </button>
        </div>

        {tables.length === 0 ? (
          <p className="muted">{t.adminTablesEmpty}</p>
        ) : (
          <div className="admin-tables-grid">
            {tables.map((table) => {
              const tableOpen = (ordersByTable.get(table.id) ?? []).filter((order) =>
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
                      {t.adminTablesOpenOrders.replace('{count}', String(tableOpen.length))}
                    </span>
                  ) : null}
                  {!table.is_active ? (
                    <span className="admin-table-badge is-inactive">{t.adminTablesInactive}</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        )}
      </fieldset>

      {selectedTable ? (
        <fieldset className="admin-company-block">
          <legend>{t.adminTablesDetail.replace('{label}', selectedTable.label)}</legend>

          {!ordering ? (
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
          ) : (
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
          )}

          {tableOrders.length === 0 ? (
            <p className="muted">{t.adminTablesNoOrders}</p>
          ) : (
            <ul className="admin-orders-list admin-tables-orders">
              {tableOrders.map((order) => {
                const canCancel = ['open', 'submitted', 'preparing', 'served'].includes(
                  order.status,
                )
                return (
                  <li key={order.id} className="admin-order-card">
                    <header className="admin-order-head">
                      <div>
                        <p className="admin-order-number">
                          {t.adminOrdersNumberLabel} #{order.orderNumber}
                        </p>
                        <p className="admin-order-meta">
                          {orderStatusLabel(t, order.status)}
                        </p>
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
                          {item.status === 'pending' && canCancel ? (
                            <button
                              type="button"
                              className="btn btn-outline btn-small"
                              disabled={busy}
                              onClick={() =>
                                onRemoveItem(selectedTable.id, order.id, item.id)
                              }
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
          )}
        </fieldset>
      ) : (
        <fieldset className="admin-company-block">
          <legend>{t.adminTablesPickTable}</legend>
          <p className="muted">{t.adminTablesPickTable}</p>
        </fieldset>
      )}
    </section>
  )
}
