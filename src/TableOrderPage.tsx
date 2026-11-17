import { useEffect, useMemo, useState } from 'react'
import { formatEuros, type Copy, type Locale } from './i18n/index.ts'

type MenuItem = {
  id: string
  name: string
  description: string | null
  price_cents: number | null
  category: string | null
  image_url: string | null
}

type CartLine = {
  id: string
  name: string
  quantity: number
}

type LoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; label: string; items: MenuItem[] }
  | { status: 'sent'; label: string; items: MenuItem[] }

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null)
}

function groupMenu(items: MenuItem[], otherLabel: string) {
  const groups = new Map<string, MenuItem[]>()
  for (const item of items) {
    const label = item.category?.trim() || otherLabel
    const list = groups.get(label) ?? []
    list.push(item)
    groups.set(label, list)
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, group]) => ({
      label,
      items: group.slice().sort((left, right) => left.name.localeCompare(right.name)),
    }))
}

export function TableOrderPage({
  tableId,
  t,
  locale,
}: {
  tableId: string
  t: Copy
  locale: Locale
}) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [cart, setCart] = useState<CartLine[]>([])
  const [notes, setNotes] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    setCart([])
    setNotes('')
    setConfirmOpen(false)
    setSendError(null)
    void (async () => {
      const response = await fetch(`/api/mesa/${encodeURIComponent(tableId)}`)
      const data = await readJson(response)
      if (cancelled) {
        return
      }
      if (!response.ok || !data || typeof data !== 'object') {
        setState({ status: 'missing' })
        return
      }
      const row = data as { label?: unknown; items?: unknown }
      const label = typeof row.label === 'string' ? row.label : ''
      const items = Array.isArray(row.items)
        ? row.items.flatMap((item) => {
            if (!item || typeof item !== 'object') {
              return []
            }
            const menuItem = item as {
              id?: unknown
              name?: unknown
              description?: unknown
              price_cents?: unknown
              category?: unknown
              image_url?: unknown
            }
            if (typeof menuItem.id !== 'string' || typeof menuItem.name !== 'string') {
              return []
            }
            const price =
              typeof menuItem.price_cents === 'number' ? menuItem.price_cents : null
            return [
              {
                id: menuItem.id,
                name: menuItem.name,
                description:
                  typeof menuItem.description === 'string' ? menuItem.description : null,
                price_cents: price,
                category: typeof menuItem.category === 'string' ? menuItem.category : null,
                image_url:
                  typeof menuItem.image_url === 'string' && menuItem.image_url.trim()
                    ? menuItem.image_url.trim()
                    : null,
              },
            ]
          })
        : []
      if (!label) {
        setState({ status: 'missing' })
        return
      }
      setState({ status: 'ready', label, items })
    })()
    return () => {
      cancelled = true
    }
  }, [tableId])

  const groups = useMemo(() => {
    if (state.status !== 'ready' && state.status !== 'sent') {
      return []
    }
    return groupMenu(state.items, t.tableOrderOther)
  }, [state, t.tableOrderOther])

  const label = state.status === 'ready' || state.status === 'sent' ? state.label : ''
  const summary = cart.map((line) => `${line.quantity}× ${line.name}`).join(', ')

  const setQty = (item: MenuItem, quantity: number) => {
    setCart((current) => {
      if (quantity < 1) {
        return current.filter((line) => line.id !== item.id)
      }
      const existing = current.find((line) => line.id === item.id)
      if (existing) {
        return current.map((line) => (line.id === item.id ? { ...line, quantity } : line))
      }
      return [...current, { id: item.id, name: item.name, quantity }]
    })
  }

  const sendOrder = async () => {
    if (cart.length === 0 || state.status !== 'ready') {
      return
    }
    setBusy(true)
    setSendError(null)
    const response = await fetch(`/api/mesa/${encodeURIComponent(tableId)}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map((line) => ({
          menu_item_id: line.id,
          quantity: line.quantity,
          line_notes: notes.trim() || undefined,
        })),
      }),
    })
    setBusy(false)
    if (!response.ok) {
      setSendError(t.tableOrderSendError)
      setConfirmOpen(false)
      return
    }
    setCart([])
    setNotes('')
    setConfirmOpen(false)
    setState({ status: 'sent', label: state.label, items: state.items })
  }

  return (
    <section className="table-order section-inner">
      {state.status === 'loading' ? <p className="muted">{t.tableOrderLoading}</p> : null}
      {state.status === 'missing' ? <p className="takeout-error">{t.tableOrderMissing}</p> : null}
      {state.status === 'sent' ? (
        <div className="table-order-sent">
          <h1>{t.tableOrderSentTitle}</h1>
          <p>{t.tableOrderHeading.replace('{label}', label)}</p>
          <p className="muted">{t.tableOrderSentLead}</p>
          <button
            type="button"
            className="btn"
            onClick={() => setState({ status: 'ready', label, items: state.items })}
          >
            {t.tableOrderOrderMore}
          </button>
        </div>
      ) : null}
      {state.status === 'ready' ? (
        <>
          <h1>{t.tableOrderHeading.replace('{label}', label)}</h1>
          <p className="muted">{t.tableOrderLead}</p>
          {groups.length === 0 ? <p className="muted">{t.tableOrderEmpty}</p> : null}
          {groups.length > 0 ? (
            <div className="table-order-groups">
              {groups.map((group) => (
                <details key={group.label} className="table-order-group">
                  <summary>
                    {group.label}
                    <span className="table-order-group-count">{group.items.length}</span>
                  </summary>
                  <ul className="table-order-menu">
                    {group.items.map((item) => {
                      const qty = cart.find((line) => line.id === item.id)?.quantity ?? 0
                      return (
                        <li key={item.id} className="table-order-item">
                          {item.image_url ? (
                            <img
                              className="table-order-photo"
                              src={item.image_url}
                              alt=""
                              loading="lazy"
                            />
                          ) : null}
                          <div className="table-order-copy">
                            <strong>{item.name}</strong>
                            {item.description ? <p className="muted">{item.description}</p> : null}
                            {item.price_cents !== null ? (
                              <span className="muted">{formatEuros(item.price_cents, locale)}</span>
                            ) : null}
                          </div>
                          <QtyControl
                            name={item.name}
                            qty={qty}
                            busy={busy}
                            addLabel={t.tableOrderAdd}
                            fewerLabel={t.tableOrderFewer}
                            moreLabel={t.tableOrderMore}
                            onChange={(next) => setQty(item, next)}
                          />
                        </li>
                      )
                    })}
                  </ul>
                </details>
              ))}
            </div>
          ) : null}
          <label className="takeout-field">
            <span>{t.tableOrderNotes}</span>
            <textarea
              rows={3}
              value={notes}
              disabled={busy}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          {sendError ? <p className="takeout-error">{sendError}</p> : null}
          <div className="table-order-send">
            <button
              type="button"
              className="btn"
              disabled={busy || cart.length === 0}
              onClick={() => setConfirmOpen(true)}
            >
              {t.tableOrderSend}
            </button>
          </div>
          {confirmOpen ? (
            <div
              className="admin-modal-overlay"
              role="presentation"
              onClick={() => {
                if (!busy) {
                  setConfirmOpen(false)
                }
              }}
            >
              <div
                className="admin-modal admin-tables-close-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="table-order-confirm-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="admin-modal-head">
                  <div>
                    <h2 id="table-order-confirm-title">{t.tableOrderConfirmTitle}</h2>
                    <p className="muted">
                      {t.tableOrderConfirmLead
                        .replace('{summary}', summary)
                        .replace('{label}', label)}
                    </p>
                  </div>
                </div>
                <div className="admin-dish-actions">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() => void sendOrder()}
                  >
                    {t.tableOrderSend}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={busy}
                    onClick={() => setConfirmOpen(false)}
                  >
                    {t.tableOrderCancel}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

function QtyControl({
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
