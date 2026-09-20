import {
  Fragment,
  useEffect,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import {
  MENU_CATEGORY_IDS,
  groupMenuByCategory,
  isMenuCategoryId,
  slugFromName,
  type StoredMenuItem,
} from './menu.ts'
import { MenuJumpNav } from './MenuJumpNav.tsx'
import { restaurant } from './content.ts'
import { AllergenIcon } from './AllergenIcon.tsx'
import { ALLERGEN_IDS, toggleAllergen } from './allergens.ts'
import {
  fallbackCompanyInfo,
  WEEKDAY_LABELS_ES,
  type StoredCompanyInfo,
} from './companyInfo.ts'
import { LanguagePicker } from './LanguagePicker.tsx'
import { type Copy, formatEuros, type Locale } from './i18n/index.ts'
import {
  activeTemplateIdForOffers,
  createTakeoutTemplateId,
  takeoutOffersMatch,
  type TakeoutCatalog,
  type TakeoutCatalogItem,
  type TakeoutTemplate,
} from './takeoutCatalog.ts'
import { RESTAURANT_TIME_ZONE } from './openingHours.ts'
import {
  AdminTablesEditor,
  type AdminTableRow,
  type GbMenuItemRow,
  type TableOrderRow,
  type TablesSubtab,
} from './AdminTablesEditor.tsx'

type AdminStatus = 'loading' | 'login' | 'ready'
type AdminTab =
  | 'menu'
  | 'account'
  | 'restaurant'
  | 'availability'
  | 'calendar'
  | 'orders'
  | 'tables'
  | 'takeout'
  | 'instagram'
type AvailabilitySubtab = 'defaults' | 'rules' | 'open-dates' | 'booking-status'
type LoginView = 'sign-in' | 'forgot' | 'reset'

const INSTAGRAM_SLOTS = 5

type BookingAvailabilitySettings = {
  id: string
  name: string
  slug: string
  timezone: string
  opens_at: string
  closes_at: string
  default_turn_minutes: number
  slot_interval_minutes: number
}

type BookingDayPreview = {
  date: string
  closed: boolean
  slot_count: number
}

type OpeningRule = {
  id: string
  name: string
  opens_at: string
  closes_at: string
  color: string
}

type OpenDateEntry = {
  id?: string
  open_date: string
  rule_id?: string
  opens_at: string
  closes_at: string
  restaurant_opening_rules?: { id?: string; name?: string; color?: string } | null
}

type AdminBooking = {
  id: string
  date: string
  startDatetime: string
  endDatetime: string | null
  timeLabel: string
  partySize: number
  status: string
  clientName: string
  clientPhone: string | null
  clientEmail: string | null
  tableLabel: string | null
  notes: string | null
}

type AdminBookingDay = {
  date: string
  bookingCount: number
}

type KitchenOrderItemStatus = 'pending' | 'preparing' | 'served'
type KitchenOrderStatus =
  | 'open'
  | 'submitted'
  | 'preparing'
  | 'served'
  | 'closed'
  | 'cancelled'

type KitchenOrderItem = {
  id: string
  item_name: string
  quantity: number
  unit_price_cents: number
  line_notes: string | null
  status: KitchenOrderItemStatus
  created_at?: string
}

type KitchenOrder = {
  id: string
  tableId: string | null
  status: KitchenOrderStatus
  created_at: string
  submitted_at: string | null
  tableLabel: string | null
  orderNumber: string
  items: KitchenOrderItem[]
}

type OrdersSubtab = 'today' | 'history'
type MenuSubtab = 'cards' | 'grid'

function adminHeading(t: Copy, tab: AdminTab): string {
  switch (tab) {
    case 'menu':
      return t.adminHeading
    case 'account':
      return t.adminAccountHeading
    case 'restaurant':
      return t.adminRestaurantHeading
    case 'availability':
      return t.adminAvailabilityHeading
    case 'calendar':
      return t.adminCalendarHeading
    case 'orders':
      return t.adminOrdersHeading
    case 'tables':
      return t.adminTablesHeading
    case 'takeout':
      return t.adminTakeoutHeading
    case 'instagram':
      return t.adminInstagramHeading
    default: {
      const _exhaustive: never = tab
      return _exhaustive
    }
  }
}

function adminLead(t: Copy, tab: AdminTab): string {
  switch (tab) {
    case 'menu':
      return t.adminLead
    case 'account':
      return t.adminAccountLead
    case 'restaurant':
      return t.adminRestaurantLead
    case 'availability':
      return t.adminAvailabilityLead
    case 'calendar':
      return t.adminCalendarLead
    case 'orders':
      return t.adminOrdersLead
    case 'tables':
      return t.adminTablesLead
    case 'takeout':
      return t.adminTakeoutLead
    case 'instagram':
      return t.adminInstagramLead
    default: {
      const _exhaustive: never = tab
      return _exhaustive
    }
  }
}

function loginHeading(t: Copy, loginView: LoginView): string {
  switch (loginView) {
    case 'sign-in':
      return t.adminLoginHeading
    case 'forgot':
      return t.adminForgotHeading
    case 'reset':
      return t.adminResetHeading
    default: {
      const _exhaustive: never = loginView
      return _exhaustive
    }
  }
}

function loginLead(t: Copy, loginView: LoginView): string {
  switch (loginView) {
    case 'sign-in':
      return t.adminLoginLead
    case 'forgot':
      return t.adminForgotLead
    case 'reset':
      return t.adminResetLead
    default: {
      const _exhaustive: never = loginView
      return _exhaustive
    }
  }
}

function resetTokenFromLocation(): string {
  const params = new URLSearchParams(window.location.search)
  return (params.get('token') ?? params.get('reset'))?.trim() || ''
}

function normalizeAdminResetUrl(): void {
  const token = resetTokenFromLocation()
  if (!token) {
    return
  }
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/admin') {
    return
  }
  window.history.replaceState(
    {},
    '',
    `/admin?token=${encodeURIComponent(token)}`,
  )
}

function emptyItem(sortOrder: number): StoredMenuItem {
  return {
    id: '',
    slug: '',
    category_id: 'starters',
    name_es: '',
    name_en: '',
    name_ja: '',
    blurb_es: '',
    blurb_en: '',
    image_url: '',
    vegetarian: false,
    sort_order: sortOrder,
    published: true,
    allergens: [],
    price_cents: 0,
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
  })
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const code =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : 'request-failed'
    throw new Error(code)
  }
  return data as T
}

function dishDomId(id: string) {
  return `admin-dish-${id || 'new'}`
}

function takeoutDishDomId(id: string) {
  return `admin-takeout-dish-${id}`
}

function jumpToMenuElement(elementId: string) {
  window.requestAnimationFrame(() => {
    document.getElementById(elementId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  })
}

function DishEditor({
  item,
  t,
  onChange,
  onSave,
  onDelete,
  onPhoto,
  busy,
  status,
  highlighted,
}: {
  item: StoredMenuItem
  t: Copy
  onChange: (item: StoredMenuItem) => void
  onSave: () => void
  onDelete: () => void
  onPhoto: (file: File) => void
  busy: boolean
  status: string | null
  highlighted: boolean
}) {
  const anchorId = dishDomId(item.id || 'new')
  const [priceInput, setPriceInput] = useState(
    item.price_cents > 0 ? (item.price_cents / 100).toFixed(2) : '',
  )

  useEffect(() => {
    setPriceInput(
      item.price_cents > 0 ? (item.price_cents / 100).toFixed(2) : '',
    )
  }, [item.id, item.price_cents])

  const set = (patch: Partial<StoredMenuItem>) => {
    onChange({ ...item, ...patch })
  }

  return (
    <article
      className={`admin-dish${highlighted ? ' is-target' : ''}`}
      id={anchorId}
    >
      <div className="admin-dish-photo">
        {item.image_url ? (
          <img src={item.image_url} alt="" />
        ) : (
          <div className="admin-dish-photo-empty">{t.adminNoPhoto}</div>
        )}
        <label className="admin-upload">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                onPhoto(file)
              }
              event.target.value = ''
            }}
          />
          {t.adminUploadPhoto}
        </label>
      </div>

      <div className="admin-dish-fields">
        <label className="takeout-field">
          <span>{t.adminNameEs}</span>
          <input
            value={item.name_es}
            onChange={(event) => {
              const name_es = event.target.value
              set({
                name_es,
                slug: item.id ? item.slug : slugFromName(name_es),
              })
            }}
          />
        </label>
        <label className="takeout-field">
          <span>{t.adminNameEn}</span>
          <input
            value={item.name_en}
            onChange={(event) => set({ name_en: event.target.value })}
          />
        </label>
        <label className="takeout-field">
          <span>{t.adminNameJa}</span>
          <input
            value={item.name_ja}
            onChange={(event) => set({ name_ja: event.target.value })}
          />
        </label>
        <label className="takeout-field">
          <span>{t.adminBlurbEs}</span>
          <textarea
            rows={2}
            value={item.blurb_es}
            onChange={(event) => set({ blurb_es: event.target.value })}
          />
        </label>
        <label className="takeout-field">
          <span>{t.adminBlurbEn}</span>
          <textarea
            rows={2}
            value={item.blurb_en}
            onChange={(event) => set({ blurb_en: event.target.value })}
          />
        </label>
        <div className="admin-dish-row">
          <label className="takeout-field">
            <span>{t.adminCategory}</span>
            <select
              value={item.category_id}
              onChange={(event) => {
                const value = event.target.value
                if (isMenuCategoryId(value)) {
                  set({ category_id: value })
                }
              }}
            >
              {MENU_CATEGORY_IDS.map((id) => (
                <option key={id} value={id}>
                  {t.cartaCategories[id]}
                </option>
              ))}
            </select>
          </label>
          <label className="takeout-field">
            <span>{t.adminSort}</span>
            <input
              type="number"
              value={item.sort_order}
              onChange={(event) =>
                set({ sort_order: Number(event.target.value) || 0 })
              }
            />
          </label>
          <label className="takeout-field">
            <span>{t.adminPrice}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={priceInput}
              onChange={(event) => {
                const raw = event.target.value
                setPriceInput(raw)
                const euros = Number(raw.replace(',', '.'))
                set({
                  price_cents:
                    Number.isFinite(euros) && euros >= 0
                      ? Math.round(euros * 100)
                      : 0,
                })
              }}
            />
          </label>
        </div>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={item.vegetarian}
            onChange={(event) => set({ vegetarian: event.target.checked })}
          />
          {t.cartaVegLabel}
        </label>
        <fieldset className="admin-allergens">
          <legend>{t.adminAllergens}</legend>
          <div className="admin-allergen-grid">
            {ALLERGEN_IDS.map((id) => {
              const allergens = item.allergens ?? []
              return (
                <label key={id} className="admin-allergen">
                  <input
                    type="checkbox"
                    checked={allergens.includes(id)}
                    onChange={(event) =>
                      set({
                        allergens: toggleAllergen(
                          allergens,
                          id,
                          event.target.checked,
                        ),
                      })
                    }
                  />
                  <AllergenIcon id={id} />
                  <span>{t.cartaAllergens[id]}</span>
                </label>
              )
            })}
          </div>
        </fieldset>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={item.published}
            onChange={(event) => set({ published: event.target.checked })}
          />
          {t.adminPublished}
        </label>
        <div className="admin-dish-actions">
          <button className="btn" type="button" disabled={busy} onClick={onSave}>
            {t.adminSave}
          </button>
          {item.id ? (
            <button
              className="btn btn-outline"
              type="button"
              disabled={busy}
              onClick={onDelete}
            >
              {t.adminDelete}
            </button>
          ) : null}
        </div>
        {status ? <p className="admin-dish-status">{status}</p> : null}
      </div>
    </article>
  )
}

function AdminMenuNav({
  items,
  currentId,
  t,
  onJump,
}: {
  items: StoredMenuItem[]
  currentId: string | null
  t: Copy
  onJump: (id: string) => void
}) {
  return (
    <MenuJumpNav
      items={items.map((item) => ({
        id: item.id,
        name: item.name_es.trim() || item.name_en.trim() || item.slug,
        category_id: item.category_id,
        sort_order: item.sort_order,
      }))}
      currentId={currentId}
      label={t.adminMenuNav}
      categoryLabels={t.cartaCategories}
      emptyLabel={t.adminEmptyCategory}
      onJump={onJump}
    />
  )
}

function MenuGridRow({
  item,
  t,
  busy,
  status,
  onChange,
  onSave,
  onDelete,
  onPreviewPhoto,
  onPhoto,
}: {
  item: StoredMenuItem
  t: Copy
  busy: boolean
  status: string | null
  onChange: (item: StoredMenuItem) => void
  onSave: () => void
  onDelete: () => void
  onPreviewPhoto: (url: string, name: string) => void
  onPhoto: (file: File) => void
}) {
  const [priceInput, setPriceInput] = useState(
    item.price_cents > 0 ? (item.price_cents / 100).toFixed(2) : '',
  )
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    setPriceInput(item.price_cents > 0 ? (item.price_cents / 100).toFixed(2) : '')
  }, [item.id, item.price_cents])

  const set = (patch: Partial<StoredMenuItem>) => {
    onChange({ ...item, ...patch })
  }

  return (
    <tr className="admin-menu-grid-row">
      <td>
        <select
          value={item.category_id}
          disabled={busy}
          onChange={(event) => {
            const value = event.target.value
            if (isMenuCategoryId(value)) {
              set({ category_id: value })
            }
          }}
        >
          {MENU_CATEGORY_IDS.map((id) => (
            <option key={id} value={id}>
              {t.cartaCategories[id]}
            </option>
          ))}
        </select>
      </td>
      <td
        className={`admin-menu-grid-photo${dragOver ? ' is-dragover' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          const file = event.dataTransfer.files?.[0]
          if (file) {
            onPhoto(file)
          }
        }}
      >
        <button
          type="button"
          className="admin-menu-grid-thumb"
          disabled={!item.image_url}
          title={t.adminMenuGridOpenPhoto}
          aria-label={t.adminMenuGridOpenPhoto}
          onClick={() =>
            onPreviewPhoto(
              item.image_url,
              item.name_es.trim() || item.name_en.trim() || item.slug,
            )
          }
        >
          {item.image_url ? (
            <img src={item.image_url} alt="" />
          ) : (
            <span className="admin-menu-grid-thumb-empty">{t.adminNoPhoto}</span>
          )}
        </button>
        <div className="admin-menu-grid-photo-actions">
          <label className="admin-menu-grid-upload">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  onPhoto(file)
                }
                event.target.value = ''
              }}
            />
            {t.adminUploadPhoto}
          </label>
          {item.image_url ? (
            <button
              type="button"
              className="admin-menu-grid-remove-photo"
              disabled={busy}
              onClick={() => set({ image_url: '' })}
            >
              {t.adminMenuGridRemovePhoto}
            </button>
          ) : null}
        </div>
        <input
          className="admin-menu-grid-photo-url"
          value={item.image_url}
          disabled={busy}
          placeholder={t.adminMenuGridPhotoUrl}
          onChange={(event) => set({ image_url: event.target.value })}
        />
      </td>
      <td>
        <input
          value={item.name_es}
          disabled={busy}
          onChange={(event) => {
            const name_es = event.target.value
            set({
              name_es,
              slug: item.id ? item.slug : slugFromName(name_es),
            })
          }}
        />
      </td>
      <td>
        <input
          value={item.name_en}
          disabled={busy}
          onChange={(event) => set({ name_en: event.target.value })}
        />
      </td>
      <td>
        <input
          value={item.name_ja}
          disabled={busy}
          onChange={(event) => set({ name_ja: event.target.value })}
        />
      </td>
      <td>
        <input
          className="admin-menu-grid-price"
          type="number"
          min="0"
          step="0.01"
          value={priceInput}
          disabled={busy}
          onChange={(event) => {
            const raw = event.target.value
            setPriceInput(raw)
            const euros = Number(raw.replace(',', '.'))
            set({
              price_cents:
                Number.isFinite(euros) && euros >= 0
                  ? Math.round(euros * 100)
                  : 0,
            })
          }}
        />
      </td>
      <td>
        <input
          className="admin-menu-grid-sort"
          type="number"
          value={item.sort_order}
          disabled={busy}
          onChange={(event) =>
            set({ sort_order: Number(event.target.value) || 0 })
          }
        />
      </td>
      <td className="admin-menu-grid-check">
        <input
          type="checkbox"
          checked={item.vegetarian}
          disabled={busy}
          onChange={(event) => set({ vegetarian: event.target.checked })}
        />
      </td>
      <td className="admin-menu-grid-check">
        <input
          type="checkbox"
          checked={item.published}
          disabled={busy}
          onChange={(event) => set({ published: event.target.checked })}
        />
      </td>
      <td className="admin-menu-grid-actions">
        <button
          className="btn btn-small"
          type="button"
          disabled={busy}
          onClick={onSave}
        >
          {t.adminSave}
        </button>
        {item.id ? (
          <button
            className="btn btn-outline btn-small"
            type="button"
            disabled={busy}
            onClick={onDelete}
          >
            {t.adminDelete}
          </button>
        ) : null}
        {status ? <span className="admin-menu-grid-status">{status}</span> : null}
      </td>
    </tr>
  )
}

function AdminMenuGrid({
  items,
  t,
  busyId,
  dishStatus,
  onChange,
  onSave,
  onDelete,
  onPhoto,
}: {
  items: StoredMenuItem[]
  t: Copy
  busyId: string | null
  dishStatus: Record<string, string>
  onChange: (item: StoredMenuItem) => void
  onSave: (item: StoredMenuItem) => void
  onDelete: (item: StoredMenuItem) => void
  onPhoto: (item: StoredMenuItem, file: File) => void
}) {
  const groups = groupMenuByCategory(items)
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(
    null,
  )
  const columnCount = 10
  return (
    <div className="admin-menu-grid-wrap">
      <table className="admin-menu-grid">
        <thead>
          <tr>
            <th>{t.adminCategory}</th>
            <th>{t.adminMenuGridPhoto}</th>
            <th>{t.adminNameEs}</th>
            <th>{t.adminNameEn}</th>
            <th>{t.adminNameJa}</th>
            <th>{t.adminPrice}</th>
            <th>{t.adminSort}</th>
            <th>{t.cartaVegLabel}</th>
            <th>{t.adminPublished}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {groups.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="muted">
                {t.adminEmptyCategory}
              </td>
            </tr>
          ) : null}
          {groups.map((group) => (
            <Fragment key={group.id}>
              <tr className="admin-menu-grid-group">
                <td colSpan={columnCount}>{t.cartaCategories[group.id]}</td>
              </tr>
              {group.items.map((item) => (
                <MenuGridRow
                  key={item.id}
                  item={item}
                  t={t}
                  busy={busyId === item.id}
                  status={dishStatus[item.id] ?? null}
                  onChange={onChange}
                  onSave={() => onSave(item)}
                  onDelete={() => onDelete(item)}
                  onPreviewPhoto={(url, name) => setPreview({ url, name })}
                  onPhoto={(file) => onPhoto(item, file)}
                />
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
      {preview ? (
        <div
          className="admin-modal-overlay"
          role="presentation"
          onClick={() => setPreview(null)}
        >
          <div
            className="admin-modal admin-menu-photo-modal"
            role="dialog"
            aria-modal="true"
            aria-label={preview.name}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-modal-head">
              <div>
                <h2>{preview.name}</h2>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-small"
                onClick={() => setPreview(null)}
              >
                {t.adminClose}
              </button>
            </div>
            <img
              className="admin-menu-photo-modal-img"
              src={preview.url}
              alt={preview.name}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function CompanyInfoEditor({
  info,
  t,
  onChange,
  onSave,
  busy,
}: {
  info: StoredCompanyInfo
  t: Copy
  onChange: (info: StoredCompanyInfo) => void
  onSave: () => void
  busy: boolean
}) {
  const set = (patch: Partial<StoredCompanyInfo>) => {
    onChange({ ...info, ...patch })
  }

  const setAddressLine = (index: number, value: string) => {
    const lines = [...info.addressLines]
    while (lines.length <= index) {
      lines.push('')
    }
    lines[index] = value
    set({ addressLines: lines })
  }

  const setHourRow = (
    index: number,
    patch: Partial<StoredCompanyInfo['hours'][number]>,
  ) => {
    set({
      hours: info.hours.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    })
  }

  const toggleOpenDay = (weekday: number, checked: boolean) => {
    const openWeekdays = checked
      ? [...new Set([...info.schedule.openWeekdays, weekday])].sort(
          (a, b) => a - b,
        )
      : info.schedule.openWeekdays.filter((day) => day !== weekday)
    set({
      schedule: {
        ...info.schedule,
        openWeekdays,
      },
    })
  }

  return (
    <section className="admin-company">
      <div className="admin-company-grid">
        <label className="takeout-field">
          <span>{t.adminCompanyPhone}</span>
          <input
            value={info.phone}
            onChange={(event) => set({ phone: event.target.value })}
          />
        </label>
        <label className="takeout-field">
          <span>{t.adminCompanyPhoneDisplay}</span>
          <input
            value={info.phoneDisplay}
            onChange={(event) => set({ phoneDisplay: event.target.value })}
          />
        </label>
      </div>

      <fieldset className="admin-company-block">
        <legend>{t.adminCompanyAddress}</legend>
        {[0, 1, 2].map((index) => (
          <label className="takeout-field" key={index}>
            <span>
              {t.adminCompanyAddress} {index + 1}
            </span>
            <input
              value={info.addressLines[index] ?? ''}
              onChange={(event) => setAddressLine(index, event.target.value)}
            />
          </label>
        ))}
        <label className="takeout-field">
          <span>{t.adminCompanyNeighborhood}</span>
          <textarea
            rows={2}
            value={info.neighborhood}
            onChange={(event) => set({ neighborhood: event.target.value })}
          />
        </label>
      </fieldset>

      <fieldset className="admin-company-block">
        <legend>{t.hoursTitle}</legend>
        <label className="takeout-field">
          <span>{t.adminCompanyHoursNote}</span>
          <textarea
            rows={2}
            value={info.hoursNote}
            onChange={(event) => set({ hoursNote: event.target.value })}
          />
        </label>
        {info.hours.map((row, index) => (
          <div className="admin-company-hours-row" key={`${index}-${row.days}`}>
            <label className="takeout-field">
              <span>{t.adminCompanyHoursDays}</span>
              <input
                value={row.days}
                onChange={(event) =>
                  setHourRow(index, { days: event.target.value })
                }
              />
            </label>
            <label className="takeout-field">
              <span>{t.adminCompanyHoursTime}</span>
              <input
                value={row.time}
                onChange={(event) =>
                  setHourRow(index, { time: event.target.value })
                }
              />
            </label>
            <button
              className="btn btn-outline btn-small"
              type="button"
              disabled={busy || info.hours.length <= 1}
              onClick={() =>
                set({
                  hours: info.hours.filter((_, rowIndex) => rowIndex !== index),
                })
              }
            >
              {t.adminCompanyRemoveHoursRow}
            </button>
          </div>
        ))}
        <button
          className="btn btn-outline btn-small"
          type="button"
          disabled={busy}
          onClick={() =>
            set({
              hours: [...info.hours, { days: '', time: '' }],
            })
          }
        >
          {t.adminCompanyAddHoursRow}
        </button>
      </fieldset>

      <fieldset className="admin-company-block">
        <legend>{t.adminCompanyOpenDays}</legend>
        <div className="admin-weekday-grid">
          {WEEKDAY_LABELS_ES.map((label, weekday) => (
            <label className="admin-check" key={label}>
              <input
                type="checkbox"
                checked={info.schedule.openWeekdays.includes(weekday)}
                onChange={(event) =>
                  toggleOpenDay(weekday, event.target.checked)
                }
              />
              {label}
            </label>
          ))}
        </div>
        <div className="admin-company-grid">
          <label className="takeout-field">
            <span>{t.adminCompanyLunchOpen}</span>
            <input
              type="time"
              value={info.schedule.lunchOpen}
              onChange={(event) =>
                set({
                  schedule: {
                    ...info.schedule,
                    lunchOpen: event.target.value,
                  },
                })
              }
            />
          </label>
          <label className="takeout-field">
            <span>{t.adminCompanyLunchClose}</span>
            <input
              type="time"
              value={info.schedule.lunchClose}
              onChange={(event) =>
                set({
                  schedule: {
                    ...info.schedule,
                    lunchClose: event.target.value,
                  },
                })
              }
            />
          </label>
        </div>
      </fieldset>

      <div className="admin-dish-actions">
        <button className="btn" type="button" disabled={busy} onClick={onSave}>
          {t.adminSave}
        </button>
      </div>
    </section>
  )
}

function monthBounds(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

function shiftMonth(year: number, month: number, delta: number) {
  const next = new Date(year, month + delta, 1)
  return { year: next.getFullYear(), month: next.getMonth() }
}

function BookingsCalendarEditor({
  days,
  bookings,
  year,
  month,
  selectedDate,
  busy,
  loadError,
  t,
  onMonthChange,
  onSelectDate,
}: {
  days: AdminBookingDay[]
  bookings: AdminBooking[]
  year: number
  month: number
  selectedDate: string | null
  busy: boolean
  loadError: string | null
  t: Copy
  onMonthChange: (year: number, month: number) => void
  onSelectDate: (date: string) => void
}) {
  const dayMap = new Map(days.map((day) => [day.date, day]))
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month, 1))
  const selectedBookings = selectedDate
    ? bookings.filter((booking) => booking.date === selectedDate)
    : []
  const selectedLabel = selectedDate
    ? new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(`${selectedDate}T12:00:00`))
    : null

  if (loadError === 'not-configured') {
    return (
      <section className="admin-company takeout-form">
        <p className="takeout-error">{t.adminCalendarNotConfigured}</p>
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
        <legend>{t.adminCalendarHeading}</legend>
        <div className="admin-availability-cal-head">
          <button
            type="button"
            className="btn btn-outline btn-small"
            aria-label={t.adminCalendarPrevMonth}
            disabled={busy}
            onClick={() => {
              const next = shiftMonth(year, month, -1)
              onMonthChange(next.year, next.month)
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
              const next = shiftMonth(year, month, 1)
              onMonthChange(next.year, next.month)
            }}
          >
            ›
          </button>
        </div>
        <div className="admin-availability-grid admin-bookings-grid" role="grid">
          {WEEKDAY_LABELS_ES.map((label) => (
            <div className="admin-availability-dow" key={label}>
              {label.slice(0, 2)}
            </div>
          ))}
          {cells.map((day, index) => {
            if (day === null) {
              return (
                <div
                  className="admin-availability-cell is-empty"
                  key={`e-${index}`}
                />
              )
            }
            const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const count = dayMap.get(key)?.bookingCount ?? 0
            const hasBookings = count > 0
            const selected = selectedDate === key
            return (
              <button
                type="button"
                className={`admin-availability-cell${hasBookings ? ' is-booked' : ''}${selected ? ' is-selected' : ''}`}
                key={key}
                disabled={busy}
                aria-pressed={selected}
                onClick={() => onSelectDate(key)}
              >
                <span>{day}</span>
                <small>{hasBookings ? String(count) : '·'}</small>
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="admin-company-block">
        <legend>
          {selectedLabel
            ? `${t.adminCalendarBookingsFor} ${selectedLabel}`
            : t.adminCalendarPickDate}
        </legend>
        {!selectedDate ? (
          <p className="muted">{t.adminCalendarPickDate}</p>
        ) : selectedBookings.length === 0 ? (
          <p className="muted">{t.adminCalendarNoBookings}</p>
        ) : (
          <ul className="admin-bookings-list">
            {selectedBookings.map((booking) => (
              <li
                key={booking.id}
                className={`admin-booking-card${booking.status === 'cancelled' ? ' is-cancelled' : ''}`}
              >
                <div className="admin-booking-head">
                  <strong>{booking.timeLabel}</strong>
                  <span>{booking.clientName}</span>
                </div>
                <dl className="admin-booking-meta">
                  <div>
                    <dt>{t.adminCalendarGuests}</dt>
                    <dd>{booking.partySize || '—'}</dd>
                  </div>
                  <div>
                    <dt>{t.adminCalendarTable}</dt>
                    <dd>{booking.tableLabel || '—'}</dd>
                  </div>
                  <div>
                    <dt>{t.adminCalendarStatus}</dt>
                    <dd>{booking.status}</dd>
                  </div>
                  {booking.clientPhone ? (
                    <div>
                      <dt>{t.adminCalendarPhone}</dt>
                      <dd>
                        <a href={`tel:${booking.clientPhone}`}>
                          {booking.clientPhone}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                  {booking.clientEmail ? (
                    <div>
                      <dt>{t.adminCalendarEmail}</dt>
                      <dd>
                        <a href={`mailto:${booking.clientEmail}`}>
                          {booking.clientEmail}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                  {booking.notes ? (
                    <div className="admin-booking-notes">
                      <dt>{t.adminCalendarNotes}</dt>
                      <dd>{booking.notes}</dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
    </section>
  )
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

function orderMadeAtIso(order: KitchenOrder): string {
  return order.submitted_at ?? order.created_at
}

function orderDateKey(order: KitchenOrder, timeZone: string): string {
  return dateKeyFromIso(orderMadeAtIso(order), timeZone)
}

function isKitchenOrderActive(order: KitchenOrder): boolean {
  return !['closed', 'cancelled'].includes(order.status)
}

function sortKitchenOrdersNewestFirst(orders: KitchenOrder[]): KitchenOrder[] {
  return orders.slice().sort((left, right) => {
    const leftMs = new Date(orderMadeAtIso(left)).getTime()
    const rightMs = new Date(orderMadeAtIso(right)).getTime()
    return rightMs - leftMs
  })
}

function formatOrdersDateLabel(dateKey: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${dateKey}T12:00:00`))
}

function KitchenOrderCards({
  orders,
  busy,
  busyItemId,
  t,
  onItemStatus,
  onOrderStatus,
}: {
  orders: KitchenOrder[]
  busy: boolean
  busyItemId: string | null
  t: Copy
  onItemStatus: (
    orderId: string,
    itemId: string,
    status: KitchenOrderItemStatus,
  ) => void
  onOrderStatus: (orderId: string, status: KitchenOrderStatus) => void
}) {
  return (
    <ul className="admin-orders-list">
      {orders.map((order) => {
        const editable = isKitchenOrderActive(order)
        return (
          <li key={order.id} className="admin-order-card">
            <header className="admin-order-head">
              <div>
                <p className="admin-order-number">
                  {t.adminOrdersNumberLabel} #{order.orderNumber}
                </p>
                <p className="admin-order-meta">
                  {order.tableLabel
                    ? `${t.adminOrdersTableLabel} ${order.tableLabel}`
                    : t.adminOrdersNoTable}
                  {' · '}
                  {kitchenOrderStatusLabel(t, order.status)}
                </p>
              </div>
              {editable ? (
                <div className="admin-order-actions">
                  {order.status !== 'served' && order.status !== 'closed' ? (
                    <button
                      type="button"
                      className="btn btn-outline btn-small"
                      disabled={busy}
                      onClick={() => onOrderStatus(order.id, 'served')}
                    >
                      {t.adminOrdersMarkServed}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-outline btn-small"
                    disabled={busy}
                    onClick={() => onOrderStatus(order.id, 'closed')}
                  >
                    {t.adminOrdersClose}
                  </button>
                </div>
              ) : null}
            </header>
            <ul className="admin-order-items">
              {order.items.map((item) => {
                const itemBusy = busyItemId === item.id || busy
                return (
                  <li key={item.id} className="admin-order-item">
                    <div className="admin-order-item-copy">
                      <strong>
                        {item.quantity}× {item.item_name}
                      </strong>
                      <span className={`admin-order-item-status is-${item.status}`}>
                        {kitchenItemStatusLabel(t, item.status)}
                      </span>
                      {item.line_notes ? (
                        <p className="muted">{item.line_notes}</p>
                      ) : null}
                    </div>
                    {editable ? (
                      <div className="admin-order-item-actions">
                        {item.status === 'pending' ? (
                          <button
                            type="button"
                            className="btn btn-small"
                            disabled={itemBusy}
                            onClick={() =>
                              onItemStatus(order.id, item.id, 'preparing')
                            }
                          >
                            {t.adminOrdersStartPreparing}
                          </button>
                        ) : null}
                        {item.status === 'preparing' ? (
                          <button
                            type="button"
                            className="btn btn-small"
                            disabled={itemBusy}
                            onClick={() =>
                              onItemStatus(order.id, item.id, 'served')
                            }
                          >
                            {t.adminOrdersMarkItemServed}
                          </button>
                        ) : null}
                        {item.status === 'served' ? (
                          <button
                            type="button"
                            className="btn btn-outline btn-small"
                            disabled={itemBusy}
                            onClick={() =>
                              onItemStatus(order.id, item.id, 'preparing')
                            }
                          >
                            {t.adminOrdersReopenItem}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </li>
        )
      })}
    </ul>
  )
}

function kitchenOrderStatusLabel(t: Copy, status: KitchenOrderStatus): string {
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

function kitchenItemStatusLabel(t: Copy, status: KitchenOrderItemStatus): string {
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

function OrdersKitchenEditor({
  orders,
  subtab,
  timeZone,
  historyYear,
  historyMonth,
  historySelectedDate,
  busy,
  busyItemId,
  loadError,
  t,
  onSubtabChange,
  onHistoryMonthChange,
  onHistorySelectDate,
  onRefresh,
  onItemStatus,
  onOrderStatus,
}: {
  orders: KitchenOrder[]
  subtab: OrdersSubtab
  timeZone: string
  historyYear: number
  historyMonth: number
  historySelectedDate: string | null
  busy: boolean
  busyItemId: string | null
  loadError: string | null
  t: Copy
  onSubtabChange: (subtab: OrdersSubtab) => void
  onHistoryMonthChange: (year: number, month: number) => void
  onHistorySelectDate: (date: string) => void
  onRefresh: () => void
  onItemStatus: (
    orderId: string,
    itemId: string,
    status: KitchenOrderItemStatus,
  ) => void
  onOrderStatus: (orderId: string, status: KitchenOrderStatus) => void
}) {
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

  const today = todayKeyInTimeZone(timeZone)
  const todayOrders = sortKitchenOrdersNewestFirst(
    orders.filter((order) => orderDateKey(order, timeZone) === today),
  )
  const orderCountByDate = new Map<string, number>()
  for (const order of orders) {
    const key = orderDateKey(order, timeZone)
    orderCountByDate.set(key, (orderCountByDate.get(key) ?? 0) + 1)
  }
  const historyOrders = historySelectedDate
    ? sortKitchenOrdersNewestFirst(
        orders.filter(
          (order) => orderDateKey(order, timeZone) === historySelectedDate,
        ),
      )
    : []
  const historyDateLabel = historySelectedDate
    ? formatOrdersDateLabel(historySelectedDate)
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

  return (
    <section className="admin-company takeout-form">
      <fieldset className="admin-company-block">
        <legend>{t.adminOrdersHeading}</legend>
        <p className="muted">{t.adminOrdersLead}</p>
        <div className="admin-orders-toolbar">
          <div className="admin-subtabs" role="tablist" aria-label={t.adminOrdersHeading}>
            <button
              type="button"
              role="tab"
              className={`admin-tab${subtab === 'today' ? ' is-active' : ''}`}
              aria-selected={subtab === 'today'}
              onClick={() => onSubtabChange('today')}
            >
              {t.adminOrdersTabToday}
            </button>
            <button
              type="button"
              role="tab"
              className={`admin-tab${subtab === 'history' ? ' is-active' : ''}`}
              aria-selected={subtab === 'history'}
              onClick={() => onSubtabChange('history')}
            >
              {t.adminOrdersTabHistory}
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
        {subtab === 'today' ? (
          todayOrders.length === 0 ? (
            <p className="muted">{t.adminOrdersEmptyToday}</p>
          ) : (
            <KitchenOrderCards
              orders={todayOrders}
              busy={busy}
              busyItemId={busyItemId}
              t={t}
              onItemStatus={onItemStatus}
              onOrderStatus={onOrderStatus}
            />
          )
        ) : (
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
                <div className="admin-availability-dow" key={`orders-${label}`}>
                  {label.slice(0, 2)}
                </div>
              ))}
              {calendarCells.map((day, index) => {
                if (day === null) {
                  return (
                    <div
                      className="admin-availability-cell is-empty"
                      key={`orders-empty-${index}`}
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
        )}
      </fieldset>

      {subtab === 'history' ? (
        <fieldset className="admin-company-block">
          <legend>
            {historyDateLabel
              ? `${t.adminOrdersForDate} ${historyDateLabel}`
              : t.adminOrdersPickDate}
          </legend>
          {!historySelectedDate ? (
            <p className="muted">{t.adminOrdersPickDate}</p>
          ) : historyOrders.length === 0 ? (
            <p className="muted">{t.adminOrdersEmptyHistory}</p>
          ) : (
            <KitchenOrderCards
              orders={historyOrders}
              busy={busy}
              busyItemId={busyItemId}
              t={t}
              onItemStatus={onItemStatus}
              onOrderStatus={onOrderStatus}
            />
          )}
        </fieldset>
      ) : null}
    </section>
  )
}

function AvailabilityEditor({
  settings,
  days,
  rules,
  openDates,
  closedDates,
  usesOpenDateCalendar,
  year,
  month,
  busy,
  loadError,
  t,
  onChange,
  onSave,
  onMonthChange,
  onCreateRule,
  onDeleteRule,
  onApplyDates,
  onClearDates,
  onToggleBookingStatus,
}: {
  settings: BookingAvailabilitySettings | null
  days: BookingDayPreview[]
  rules: OpeningRule[]
  openDates: OpenDateEntry[]
  closedDates: string[]
  usesOpenDateCalendar: boolean
  year: number
  month: number
  busy: boolean
  loadError: string | null
  t: Copy
  onChange: (next: BookingAvailabilitySettings) => void
  onSave: () => void
  onMonthChange: (year: number, month: number) => void
  onCreateRule: (input: {
    name: string
    opensAt: string
    closesAt: string
  }) => Promise<void>
  onDeleteRule: (id: string) => Promise<void>
  onApplyDates: (ruleId: string, dates: string[]) => Promise<void>
  onClearDates: (dates: string[]) => Promise<void>
  onToggleBookingStatus: (date: string, open: boolean) => Promise<void>
}) {
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [ruleName, setRuleName] = useState('Lunch')
  const [ruleOpensAt, setRuleOpensAt] = useState('13:00')
  const [ruleClosesAt, setRuleClosesAt] = useState('16:30')
  const [subtab, setSubtab] = useState<AvailabilitySubtab>('defaults')

  useEffect(() => {
    if (selectedRuleId && !rules.some((rule) => rule.id === selectedRuleId)) {
      setSelectedRuleId(null)
    }
    if (!selectedRuleId && rules[0]) {
      setSelectedRuleId(rules[0].id)
    }
  }, [rules, selectedRuleId])

  useEffect(() => {
    setSelectedDates([])
  }, [year, month])

  const dayMap = new Map(days.map((day) => [day.date, day]))
  const closedSet = new Set(closedDates)
  const openByDate = new Map<string, OpenDateEntry[]>()
  for (const row of openDates) {
    const list = openByDate.get(row.open_date) ?? []
    list.push(row)
    openByDate.set(row.open_date, list)
  }
  const selectedSet = new Set(selectedDates)
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month, 1))

  if (loadError === 'not-configured') {
    return (
      <section className="admin-company takeout-form">
        <p className="takeout-error">{t.adminAvailabilityNotConfigured}</p>
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

  if (!settings) {
    return (
      <section className="admin-company takeout-form">
        <p className="muted">{t.adminLoading}</p>
      </section>
    )
  }

  const patch = (partial: Partial<BookingAvailabilitySettings>) => {
    onChange({ ...settings, ...partial })
  }

  const toggleDate = (dateKey: string) => {
    setSelectedDates((current) =>
      current.includes(dateKey)
        ? current.filter((value) => value !== dateKey)
        : [...current, dateKey].sort(),
    )
  }

  const selectWeekdays = () => {
    const dates: string[] = []
    for (let day = 1; day <= daysInMonth; day += 1) {
      const weekday = new Date(year, month, day).getDay()
      if (weekday === 0 || weekday === 6) {
        continue
      }
      dates.push(
        `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      )
    }
    setSelectedDates(dates)
  }

  const selectedRule = rules.find((rule) => rule.id === selectedRuleId) ?? null

  let panel: ReactNode
  switch (subtab) {
    case 'defaults':
      panel = (
        <fieldset className="admin-company-block">
          <legend>{t.adminAvailabilitySubtabDefaults}</legend>
          <p className="muted">
            {settings.name} · {settings.slug}
          </p>
          <p className="muted">{t.adminAvailabilityDefaultsLead}</p>
          <div className="admin-company-grid">
            <label className="takeout-field">
              <span>{t.adminAvailabilityOpensAt}</span>
              <input
                type="time"
                value={settings.opens_at}
                onChange={(event) => patch({ opens_at: event.target.value })}
              />
            </label>
            <label className="takeout-field">
              <span>{t.adminAvailabilityClosesAt}</span>
              <input
                type="time"
                value={settings.closes_at}
                onChange={(event) => patch({ closes_at: event.target.value })}
              />
            </label>
            <label className="takeout-field">
              <span>{t.adminAvailabilitySlotInterval}</span>
              <input
                type="number"
                min={1}
                value={settings.slot_interval_minutes}
                onChange={(event) =>
                  patch({
                    slot_interval_minutes: Number(event.target.value) || 1,
                  })
                }
              />
            </label>
            <label className="takeout-field">
              <span>{t.adminAvailabilityTurnMinutes}</span>
              <input
                type="number"
                min={1}
                value={settings.default_turn_minutes}
                onChange={(event) =>
                  patch({
                    default_turn_minutes: Number(event.target.value) || 1,
                  })
                }
              />
            </label>
            <label className="takeout-field">
              <span>{t.adminAvailabilityTimezone}</span>
              <input
                value={settings.timezone}
                onChange={(event) => patch({ timezone: event.target.value })}
              />
            </label>
          </div>
          <div className="admin-dish-actions">
            <button className="btn" type="button" disabled={busy} onClick={onSave}>
              {t.adminAvailabilitySave}
            </button>
          </div>
        </fieldset>
      )
      break
    case 'rules':
      panel = (
        <fieldset className="admin-company-block">
          <legend>{t.adminOpenRulesHeading}</legend>
          <p className="muted">{t.adminOpenRulesLead}</p>
          {rules.length === 0 ? (
            <p className="muted">{t.adminOpenRulesEmpty}</p>
          ) : (
            <ul className="admin-open-rules">
              {rules.map((rule) => (
                <li key={rule.id}>
                  <label className="admin-open-rule">
                    <input
                      type="radio"
                      name="opening-rule"
                      checked={selectedRuleId === rule.id}
                      onChange={() => setSelectedRuleId(rule.id)}
                    />
                    <span>
                      <strong>{rule.name}</strong>
                      <small>
                        {rule.opens_at} – {rule.closes_at}
                      </small>
                    </span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-outline btn-small"
                    disabled={busy}
                    onClick={() => void onDeleteRule(rule.id)}
                  >
                    {t.adminOpenRuleDelete}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="admin-company-grid">
            <label className="takeout-field">
              <span>{t.adminOpenRuleName}</span>
              <input
                value={ruleName}
                onChange={(event) => setRuleName(event.target.value)}
              />
            </label>
            <label className="takeout-field">
              <span>{t.adminAvailabilityOpensAt}</span>
              <input
                type="time"
                value={ruleOpensAt}
                onChange={(event) => setRuleOpensAt(event.target.value)}
              />
            </label>
            <label className="takeout-field">
              <span>{t.adminAvailabilityClosesAt}</span>
              <input
                type="time"
                value={ruleClosesAt}
                onChange={(event) => setRuleClosesAt(event.target.value)}
              />
            </label>
          </div>
          <div className="admin-dish-actions">
            <button
              className="btn"
              type="button"
              disabled={busy || !ruleName.trim()}
              onClick={() =>
                void onCreateRule({
                  name: ruleName,
                  opensAt: ruleOpensAt,
                  closesAt: ruleClosesAt,
                })
              }
            >
              {t.adminOpenRuleCreate}
            </button>
          </div>
        </fieldset>
      )
      break
    case 'open-dates':
      panel = (
        <fieldset className="admin-company-block">
          <legend>{t.adminOpenDatesHeading}</legend>
          <p className="muted">
            {usesOpenDateCalendar
              ? t.adminOpenDatesAllowlistNote
              : t.adminOpenDatesFallbackNote}
          </p>
          <label className="takeout-field">
            <span>{t.adminOpenDatesActiveRule}</span>
            <select
              value={selectedRuleId ?? ''}
              disabled={busy || rules.length === 0}
              onChange={(event) =>
                setSelectedRuleId(event.target.value || null)
              }
            >
              {rules.length === 0 ? (
                <option value="">{t.adminOpenRulesEmpty}</option>
              ) : (
                rules.map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    {rule.name} ({rule.opens_at} – {rule.closes_at})
                  </option>
                ))
              )}
            </select>
          </label>
          {selectedRule ? (
            <p className="muted">
              {selectedRule.name}: {selectedRule.opens_at} –{' '}
              {selectedRule.closes_at}
            </p>
          ) : null}
          <div className="admin-availability-cal-head">
            <button
              type="button"
              className="btn btn-outline btn-small"
              aria-label={t.adminAvailabilityPrevMonth}
              onClick={() => {
                const next = shiftMonth(year, month, -1)
                onMonthChange(next.year, next.month)
              }}
            >
              ‹
            </button>
            <p>{monthLabel}</p>
            <button
              type="button"
              className="btn btn-outline btn-small"
              aria-label={t.adminAvailabilityNextMonth}
              onClick={() => {
                const next = shiftMonth(year, month, 1)
                onMonthChange(next.year, next.month)
              }}
            >
              ›
            </button>
          </div>
          <div className="admin-availability-grid" role="grid">
            {WEEKDAY_LABELS_ES.map((label) => (
              <div className="admin-availability-dow" key={label}>
                {label.slice(0, 2)}
              </div>
            ))}
            {cells.map((day, index) => {
              if (day === null) {
                return (
                  <div
                    className="admin-availability-cell is-empty"
                    key={`e-${index}`}
                  />
                )
              }
              const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const row = dayMap.get(key)
              const dayOpenRows = openByDate.get(key) ?? []
              const closed = usesOpenDateCalendar
                ? dayOpenRows.length === 0
                : (row?.closed ?? true)
              const slots = row?.slot_count ?? 0
              const selected = selectedSet.has(key)
              const ruleLabel =
                dayOpenRows
                  .map(
                    (entry) =>
                      entry.restaurant_opening_rules?.name ||
                      rules.find((rule) => rule.id === entry.rule_id)?.name ||
                      `${entry.opens_at}-${entry.closes_at}`,
                  )
                  .join(', ') || null
              return (
                <button
                  type="button"
                  className={`admin-availability-cell${closed ? ' is-closed' : ' is-open'}${selected ? ' is-selected' : ''}`}
                  key={key}
                  disabled={busy}
                  title={
                    closed
                      ? t.adminAvailabilityClosed
                      : `${t.adminAvailabilityOpen} · ${slots}${ruleLabel ? ` · ${ruleLabel}` : ''}`
                  }
                  onClick={() => toggleDate(key)}
                >
                  <span>{day}</span>
                  <small>
                    {closed
                      ? t.adminAvailabilityClosed
                      : ruleLabel || String(slots)}
                  </small>
                </button>
              )
            })}
          </div>
          <div className="admin-open-dates-actions">
            <button
              type="button"
              className="btn btn-outline btn-small"
              disabled={busy}
              onClick={selectWeekdays}
            >
              {t.adminOpenDatesSelectWeekdays}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-small"
              disabled={busy || selectedDates.length === 0}
              onClick={() => setSelectedDates([])}
            >
              {t.adminOpenDatesClearSelection}
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy || !selectedRuleId || selectedDates.length === 0}
              onClick={() => {
                if (!selectedRuleId) {
                  return
                }
                void onApplyDates(selectedRuleId, selectedDates).then(() =>
                  setSelectedDates([]),
                )
              }}
            >
              {t.adminOpenDatesApply}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy || selectedDates.length === 0}
              onClick={() => {
                void onClearDates(selectedDates).then(() =>
                  setSelectedDates([]),
                )
              }}
            >
              {t.adminOpenDatesClear}
            </button>
          </div>
          <p className="muted">
            {t.adminOpenDatesSelectedCount.replace(
              '{count}',
              String(selectedDates.length),
            )}
          </p>
        </fieldset>
      )
      break
    case 'booking-status':
      panel = (
        <fieldset className="admin-company-block">
          <legend>{t.adminBookingStatusHeading}</legend>
          <p className="muted">{t.adminBookingStatusLead}</p>
          <div className="admin-availability-cal-head">
            <button
              type="button"
              className="btn btn-outline btn-small"
              aria-label={t.adminAvailabilityPrevMonth}
              onClick={() => {
                const next = shiftMonth(year, month, -1)
                onMonthChange(next.year, next.month)
              }}
            >
              ‹
            </button>
            <p>{monthLabel}</p>
            <button
              type="button"
              className="btn btn-outline btn-small"
              aria-label={t.adminAvailabilityNextMonth}
              onClick={() => {
                const next = shiftMonth(year, month, 1)
                onMonthChange(next.year, next.month)
              }}
            >
              ›
            </button>
          </div>
          <div className="admin-booking-status-grid" role="grid">
            {WEEKDAY_LABELS_ES.map((label) => (
              <div className="admin-availability-dow" key={label}>
                {label.slice(0, 2)}
              </div>
            ))}
            {cells.map((day, index) => {
              if (day === null) {
                return (
                  <div
                    className="admin-booking-status-cell is-empty"
                    key={`e-${index}`}
                  />
                )
              }
              const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const open = !closedSet.has(key)
              const id = `booking-status-${key}`
              return (
                <label
                  className={`admin-booking-status-cell${open ? ' is-open' : ' is-closed'}`}
                  key={key}
                  htmlFor={id}
                >
                  <span className="admin-booking-status-day">{day}</span>
                  <input
                    id={id}
                    type="checkbox"
                    checked={open}
                    disabled={busy}
                    aria-label={
                      open
                        ? `${key}: ${t.adminBookingStatusOpen}`
                        : `${key}: ${t.adminBookingStatusClosed}`
                    }
                    onChange={(event) => {
                      void onToggleBookingStatus(key, event.target.checked)
                    }}
                  />
                  <small>
                    {open
                      ? t.adminBookingStatusOpen
                      : t.adminBookingStatusClosed}
                  </small>
                </label>
              )
            })}
          </div>
        </fieldset>
      )
      break
    default: {
      const _exhaustive: never = subtab
      panel = _exhaustive
      break
    }
  }

  return (
    <section className="admin-company takeout-form">
      <div
        className="admin-tabs admin-subtabs"
        role="tablist"
        aria-label={t.adminAvailabilityHeading}
      >
        <button
          type="button"
          role="tab"
          className={`admin-tab${subtab === 'defaults' ? ' is-active' : ''}`}
          aria-selected={subtab === 'defaults'}
          onClick={() => setSubtab('defaults')}
        >
          {t.adminAvailabilitySubtabDefaults}
        </button>
        <button
          type="button"
          role="tab"
          className={`admin-tab${subtab === 'rules' ? ' is-active' : ''}`}
          aria-selected={subtab === 'rules'}
          onClick={() => setSubtab('rules')}
        >
          {t.adminAvailabilitySubtabRules}
        </button>
        <button
          type="button"
          role="tab"
          className={`admin-tab${subtab === 'open-dates' ? ' is-active' : ''}`}
          aria-selected={subtab === 'open-dates'}
          onClick={() => setSubtab('open-dates')}
        >
          {t.adminAvailabilitySubtabOpenDates}
        </button>
        <button
          type="button"
          role="tab"
          className={`admin-tab${subtab === 'booking-status' ? ' is-active' : ''}`}
          aria-selected={subtab === 'booking-status'}
          onClick={() => setSubtab('booking-status')}
        >
          {t.adminAvailabilitySubtabBookingStatus}
        </button>
      </div>
      {panel}
    </section>
  )
}

function emptyInstagramSlots(): string[] {
  return Array.from({ length: INSTAGRAM_SLOTS }, () => '')
}

function InstagramEditor({
  urls,
  busy,
  t,
  onChange,
  onSave,
}: {
  urls: string[]
  busy: boolean
  t: Copy
  onChange: (next: string[]) => void
  onSave: () => void
}) {
  const slots = [...urls]
  while (slots.length < INSTAGRAM_SLOTS) {
    slots.push('')
  }

  return (
    <section className="admin-company takeout-form">
      <fieldset className="admin-company-block">
        <legend>{t.adminInstagramHeading}</legend>
        <p className="muted">{t.adminInstagramLead}</p>
        {slots.slice(0, INSTAGRAM_SLOTS).map((value, index) => (
          <label className="takeout-field" key={`ig-slot-${String(index + 1)}`}>
            <span>
              {t.adminInstagramPostLabel} #{index + 1}
            </span>
            <textarea
              rows={3}
              value={value}
              disabled={busy}
              placeholder={t.adminInstagramPlaceholder}
              onChange={(event) => {
                const next = [...slots]
                next[index] = event.target.value
                onChange(next.slice(0, INSTAGRAM_SLOTS))
              }}
            />
          </label>
        ))}
        <button
          className="btn"
          type="button"
          disabled={busy}
          onClick={onSave}
        >
          {t.adminInstagramSave}
        </button>
      </fieldset>
    </section>
  )
}

function sortTakeoutTemplates(templates: TakeoutTemplate[]): TakeoutTemplate[] {
  return templates.slice().sort((left, right) => left.name.localeCompare(right.name))
}

function offersFromMenuItems(
  items: StoredMenuItem[],
  offerMap: Map<string, number>,
): TakeoutCatalogItem[] {
  return items
    .map((item) => ({
      slug: item.slug,
      maxQty: offerMap.get(item.slug) ?? 10,
    }))
    .sort((left, right) => left.slug.localeCompare(right.slug))
}

type TakeoutPersistInput = {
  enabled: boolean
  items: TakeoutCatalogItem[]
  templates: TakeoutTemplate[]
  activeTemplateId: string | null
}

function toggleTakeoutOffer(
  offers: TakeoutCatalogItem[],
  slug: string,
  selected: boolean,
  maxQty: number,
): TakeoutCatalogItem[] {
  const next = offers.filter((offer) => offer.slug !== slug)
  if (selected) {
    next.push({ slug, maxQty: Math.max(1, Math.floor(maxQty) || 1) })
    next.sort((a, b) => a.slug.localeCompare(b.slug))
  }
  return next
}

type TakeoutSubtab = 'modes' | 'new'

function TakeoutCatalogEditor({
  items,
  enabled,
  offers,
  templates,
  activeTemplateId,
  busy,
  t,
  onEnabledChange,
  onSave,
  onPersist,
}: {
  items: StoredMenuItem[]
  enabled: boolean
  offers: TakeoutCatalogItem[]
  templates: TakeoutTemplate[]
  activeTemplateId: string | null
  busy: boolean
  t: Copy
  onEnabledChange: (enabled: boolean) => void
  onSave: () => void
  onPersist: (catalog: TakeoutPersistInput) => void
}) {
  const [subtab, setSubtab] = useState<TakeoutSubtab>('modes')
  const [focusId, setFocusId] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [draftOffers, setDraftOffers] = useState<TakeoutCatalogItem[]>(offers)
  const offerMap = new Map(offers.map((offer) => [offer.slug, offer.maxQty]))
  const draftMap = new Map(draftOffers.map((offer) => [offer.slug, offer.maxQty]))
  const published = items
    .filter((item) => item.published)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order || a.name_es.localeCompare(b.name_es))
  const activeTemplate = templates.find((template) => template.id === activeTemplateId)
  const currentModeLabel = activeTemplate
    ? t.adminTakeoutCurrentMode.replace('{name}', activeTemplate.name)
    : t.adminTakeoutCurrentMode.replace('{name}', t.adminTakeoutCurrentCustom)

  const persistMode = (name: string, nextItems: TakeoutCatalogItem[]) => {
    if (nextItems.length === 0) {
      setTemplateError(t.adminTakeoutTemplateNeedItems)
      return
    }
    setTemplateError(null)
    let nextTemplates = templates
    let match = nextTemplates.find((template) =>
      takeoutOffersMatch(template.items, nextItems),
    )
    if (!match) {
      match = {
        id: createTakeoutTemplateId(),
        name,
        items: nextItems,
      }
      nextTemplates = sortTakeoutTemplates([...nextTemplates, match])
    }
    onPersist({
      enabled,
      items: nextItems,
      templates: nextTemplates,
      activeTemplateId: match.id,
    })
  }

  const saveDraftAsTemplate = (activate: boolean) => {
    const name = templateName.trim()
    if (!name) {
      setTemplateError(t.adminTakeoutTemplateNeedName)
      return
    }
    if (draftOffers.length === 0) {
      setTemplateError(t.adminTakeoutTemplateNeedItems)
      return
    }
    setTemplateError(null)
    const existing = templates.find((template) =>
      takeoutOffersMatch(template.items, draftOffers),
    )
    const created = existing
      ? { ...existing, name }
      : { id: createTakeoutTemplateId(), name, items: draftOffers }
    const nextTemplates = existing
      ? sortTakeoutTemplates(
          templates.map((template) =>
            template.id === existing.id ? created : template,
          ),
        )
      : sortTakeoutTemplates([...templates, created])
    onPersist({
      enabled,
      items: activate ? draftOffers : offers,
      templates: nextTemplates,
      activeTemplateId: activate
        ? created.id
        : activeTemplateIdForOffers(nextTemplates, offers),
    })
    setTemplateName('')
    setSubtab('modes')
  }

  const openNewTab = () => {
    setDraftOffers(offers)
    setTemplateError(null)
    setSubtab('new')
  }

  const jumpToItem = (id: string) => {
    setFocusId(id)
    jumpToMenuElement(takeoutDishDomId(id))
  }

  const renderTakeoutItem = (
    item: StoredMenuItem,
    map: Map<string, number>,
    onToggle: (slug: string, selected: boolean, maxQty: number) => void,
  ) => {
    const selected = map.has(item.slug)
    const maxQty = map.get(item.slug) ?? 10
    return (
      <li
        key={item.id}
        id={takeoutDishDomId(item.id)}
        className={
          focusId === item.id
            ? 'admin-takeout-item is-target'
            : 'admin-takeout-item'
        }
      >
        <label className="admin-takeout-item-check">
          <input
            type="checkbox"
            checked={selected}
            disabled={busy}
            onChange={(event) =>
              onToggle(item.slug, event.target.checked, maxQty)
            }
          />
          <span>
            <strong>{item.name_es || item.slug}</strong>
            {item.name_ja ? <small>{item.name_ja}</small> : null}
          </span>
        </label>
        <label className="takeout-field admin-takeout-qty">
          <span>{t.adminTakeoutMaxQty}</span>
          <input
            type="number"
            min={1}
            max={999}
            value={maxQty}
            disabled={busy || !selected}
            onChange={(event) =>
              onToggle(item.slug, selected, Number(event.target.value) || 1)
            }
          />
        </label>
      </li>
    )
  }

  const sectionModeButtons = (
    onPick: (name: string, nextItems: TakeoutCatalogItem[]) => void,
    map: Map<string, number>,
  ) => (
    <div className="admin-takeout-modes">
      <button
        className="btn btn-outline"
        type="button"
        disabled={busy}
        onClick={() =>
          onPick(t.adminTakeoutFromAll, offersFromMenuItems(published, map))
        }
      >
        {t.adminTakeoutFromAll}
      </button>
      {MENU_CATEGORY_IDS.map((categoryId) => {
        const rows = published.filter((item) => item.category_id === categoryId)
        if (rows.length === 0) {
          return null
        }
        const section = t.cartaCategories[categoryId]
        return (
          <button
            className="btn btn-outline"
            type="button"
            disabled={busy}
            key={categoryId}
            onClick={() =>
              onPick(
                t.adminTakeoutFromSection.replace('{section}', section),
                offersFromMenuItems(rows, map),
              )
            }
          >
            {t.adminTakeoutFromSection.replace('{section}', section)}
          </button>
        )
      })}
    </div>
  )

  const dishPicker = (
    map: Map<string, number>,
    onToggle: (slug: string, selected: boolean, maxQty: number) => void,
  ) => (
    <div className="admin-menu-layout">
      <MenuJumpNav
        items={published.map((item) => ({
          id: item.id,
          name: item.name_es.trim() || item.name_en.trim() || item.slug,
          category_id: item.category_id,
          sort_order: item.sort_order,
        }))}
        currentId={focusId}
        label={t.adminMenuNav}
        categoryLabels={t.cartaCategories}
        emptyLabel={t.adminEmptyCategory}
        includeEmptyCategories={false}
        onJump={jumpToItem}
      />
      <div className="admin-menu-body">
        {MENU_CATEGORY_IDS.map((categoryId) => {
          const rows = published.filter((item) => item.category_id === categoryId)
          if (rows.length === 0) {
            return null
          }
          return (
            <section className="carta-section" key={categoryId}>
              <h2>{t.cartaCategories[categoryId]}</h2>
              <ul className="admin-takeout-items">
                {rows.map((item) => renderTakeoutItem(item, map, onToggle))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )

  let panel: ReactNode
  switch (subtab) {
    case 'modes':
      panel = (
        <section className="admin-takeout-templates">
          <p className="muted">{t.adminTakeoutTemplatesLead}</p>
          <p className="admin-takeout-current-mode">{currentModeLabel}</p>
          {sectionModeButtons(persistMode, offerMap)}
          {templates.length === 0 ? (
            <p className="muted">{t.adminTakeoutTemplateEmpty}</p>
          ) : (
            <ul className="admin-takeout-template-list">
              {templates.map((template) => {
                const active = template.id === activeTemplateId
                return (
                  <li
                    key={template.id}
                    className={
                      active
                        ? 'admin-takeout-template is-active'
                        : 'admin-takeout-template'
                    }
                  >
                    <div>
                      <strong>{template.name}</strong>
                      {active ? (
                        <span className="admin-takeout-template-badge">
                          {t.adminTakeoutTemplateActive}
                        </span>
                      ) : null}
                      <small>
                        {t.adminTakeoutTemplateCount.replace(
                          '{count}',
                          String(template.items.length),
                        )}
                      </small>
                    </div>
                    <div className="admin-dish-actions">
                      <button
                        className="btn btn-small"
                        type="button"
                        disabled={busy || active}
                        onClick={() =>
                          onPersist({
                            enabled,
                            items: template.items,
                            templates,
                            activeTemplateId: template.id,
                          })
                        }
                      >
                        {t.adminTakeoutTemplateActivate}
                      </button>
                      <button
                        className="btn btn-outline btn-small"
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const ok = window.confirm(
                            t.adminTakeoutTemplateDeleteConfirm.replace(
                              '{name}',
                              template.name,
                            ),
                          )
                          if (!ok) {
                            return
                          }
                          const nextTemplates = templates.filter(
                            (row) => row.id !== template.id,
                          )
                          onPersist({
                            enabled,
                            items: offers,
                            templates: nextTemplates,
                            activeTemplateId: activeTemplateIdForOffers(
                              nextTemplates,
                              offers,
                            ),
                          })
                        }}
                      >
                        {t.adminTakeoutTemplateDelete}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )
      break
    case 'new':
      panel = (
        <section className="admin-takeout-templates">
          <p className="muted">{t.adminTakeoutNewLead}</p>
          {sectionModeButtons((name, nextItems) => {
            setDraftOffers(nextItems)
            if (!templateName.trim()) {
              setTemplateName(name)
            }
            setTemplateError(null)
          }, draftMap)}
          <div className="admin-takeout-template-create">
            <label className="takeout-field">
              <span>{t.adminTakeoutTemplateName}</span>
              <input
                value={templateName}
                disabled={busy}
                placeholder={t.adminTakeoutTemplateNamePlaceholder}
                onChange={(event) => {
                  setTemplateName(event.target.value)
                  setTemplateError(null)
                }}
              />
            </label>
            <button
              className="btn btn-outline"
              type="button"
              disabled={busy}
              onClick={() => saveDraftAsTemplate(false)}
            >
              {t.adminTakeoutTemplateSaveCurrent}
            </button>
            <button
              className="btn"
              type="button"
              disabled={busy}
              onClick={() => saveDraftAsTemplate(true)}
            >
              {t.adminTakeoutTemplateSaveAndUse}
            </button>
          </div>
          {templateError ? (
            <p className="takeout-error">{templateError}</p>
          ) : null}
          {dishPicker(draftMap, (slug, selected, maxQty) =>
            setDraftOffers((prev) =>
              toggleTakeoutOffer(prev, slug, selected, maxQty),
            ),
          )}
        </section>
      )
      break
    default: {
      const _exhaustive: never = subtab
      panel = _exhaustive
    }
  }

  return (
    <section className="admin-company takeout-form">
      <fieldset className="admin-company-block">
        <legend>{t.adminTakeoutHeading}</legend>
        <p className="muted">{t.adminTakeoutLead}</p>
        <label className="admin-takeout-enable">
          <input
            type="checkbox"
            checked={enabled}
            disabled={busy}
            onChange={(event) => onEnabledChange(event.target.checked)}
          />
          <span>{t.adminTakeoutEnabled}</span>
        </label>
        {published.length === 0 ? (
          <p className="muted">{t.adminTakeoutNoMenu}</p>
        ) : (
          <>
            <div
              className="admin-tabs admin-subtabs"
              role="tablist"
              aria-label={t.adminTakeoutTemplatesHeading}
            >
              <button
                type="button"
                role="tab"
                className={`admin-tab${subtab === 'modes' ? ' is-active' : ''}`}
                aria-selected={subtab === 'modes'}
                onClick={() => {
                  setTemplateError(null)
                  setSubtab('modes')
                }}
              >
                {t.adminTakeoutSubtabModes}
              </button>
              <button
                type="button"
                role="tab"
                className={`admin-tab${subtab === 'new' ? ' is-active' : ''}`}
                aria-selected={subtab === 'new'}
                onClick={openNewTab}
              >
                {t.adminTakeoutSubtabNew}
              </button>
            </div>
            {panel}
          </>
        )}
        <div className="admin-dish-actions">
          <button className="btn" type="button" disabled={busy} onClick={onSave}>
            {t.adminTakeoutSave}
          </button>
        </div>
      </fieldset>
    </section>
  )
}

function AccountInfoEditor({
  accountUsername,
  resetEmail,
  currentPassword,
  newPassword,
  confirmPassword,
  onResetEmailChange,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSaveEmail,
  onSavePassword,
  emailBusy,
  passwordBusy,
  t,
}: {
  accountUsername: string
  resetEmail: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
  onResetEmailChange: (value: string) => void
  onCurrentPasswordChange: (value: string) => void
  onNewPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onSaveEmail: () => void
  onSavePassword: () => void
  emailBusy: boolean
  passwordBusy: boolean
  t: Copy
}) {
  return (
    <section className="admin-account takeout-form">
      <label className="takeout-field">
        <span>{t.adminUser}</span>
        <input value={accountUsername} readOnly />
      </label>

      <fieldset className="admin-company-block">
        <legend>{t.adminAccountRecoveryEmail}</legend>
        <p className="muted">{t.adminAccountRecoveryEmailHelp}</p>
        <label className="takeout-field">
          <span>{t.adminAccountRecoveryEmail}</span>
          <input
            type="email"
            autoComplete="email"
            value={resetEmail}
            disabled={emailBusy}
            onChange={(event) => onResetEmailChange(event.target.value)}
          />
        </label>
        <button
          className="btn"
          type="button"
          disabled={emailBusy || !resetEmail.trim()}
          onClick={onSaveEmail}
        >
          {t.adminAccountSaveEmail}
        </button>
      </fieldset>

      <fieldset className="admin-company-block">
        <legend>{t.adminAccountChangePassword}</legend>
        <label className="takeout-field">
          <span>{t.adminAccountCurrentPassword}</span>
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            disabled={passwordBusy}
            onChange={(event) => onCurrentPasswordChange(event.target.value)}
          />
        </label>
        <label className="takeout-field">
          <span>{t.adminResetPassword}</span>
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            disabled={passwordBusy}
            onChange={(event) => onNewPasswordChange(event.target.value)}
          />
        </label>
        <label className="takeout-field">
          <span>{t.adminResetConfirm}</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            disabled={passwordBusy}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
          />
        </label>
      </fieldset>

      <button
        className="btn"
        type="button"
        disabled={passwordBusy}
        onClick={onSavePassword}
      >
        {t.adminAccountSavePassword}
      </button>
    </section>
  )
}

export function AdminPage({
  t,
  locale,
  onHome,
  onLocaleChange,
}: {
  t: Copy
  locale: Locale
  onHome: (event: MouseEvent<HTMLAnchorElement>) => void
  onLocaleChange: (locale: Locale) => void
}) {
  const [status, setStatus] = useState<AdminStatus>('loading')
  const [loginView, setLoginView] = useState<LoginView>(() =>
    resetTokenFromLocation() ? 'reset' : 'sign-in',
  )
  const [resetToken, setResetToken] = useState(() => resetTokenFromLocation())
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginMessage, setLoginMessage] = useState<string | null>(null)
  const [items, setItems] = useState<StoredMenuItem[]>([])
  const [drafts, setDrafts] = useState<Record<string, StoredMenuItem>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [dishStatus, setDishStatus] = useState<Record<string, string>>({})
  const [menuFocusId, setMenuFocusId] = useState<string | null>(null)
  const [menuSubtab, setMenuSubtab] = useState<MenuSubtab>('cards')
  const [newDishOpen, setNewDishOpen] = useState(false)
  const [newCategoryOpen, setNewCategoryOpen] = useState(false)
  const [kitchenCategories, setKitchenCategories] = useState<
    Array<{ id: string; name: string; sort_order: number }>
  >([])
  const [categoryName, setCategoryName] = useState('')
  const [categorySort, setCategorySort] = useState('0')
  const [categoryBusy, setCategoryBusy] = useState(false)
  const [categoryStatus, setCategoryStatus] = useState<string | null>(null)
  const [inventoryBusy, setInventoryBusy] = useState(false)
  const [inventoryStatus, setInventoryStatus] = useState<string | null>(null)
  const [tab, setTab] = useState<AdminTab>('menu')
  const [companyInfo, setCompanyInfo] = useState<StoredCompanyInfo>(
    fallbackCompanyInfo(),
  )
  const [companyDraft, setCompanyDraft] = useState<StoredCompanyInfo | null>(
    null,
  )
  const [companyBusy, setCompanyBusy] = useState(false)
  const [accountUsername, setAccountUsername] = useState('')
  const [accountResetEmail, setAccountResetEmail] = useState('')
  const [accountCurrentPassword, setAccountCurrentPassword] = useState('')
  const [accountNewPassword, setAccountNewPassword] = useState('')
  const [accountConfirmPassword, setAccountConfirmPassword] = useState('')
  const [accountEmailBusy, setAccountEmailBusy] = useState(false)
  const [accountPasswordBusy, setAccountPasswordBusy] = useState(false)
  const [availabilitySettings, setAvailabilitySettings] =
    useState<BookingAvailabilitySettings | null>(null)
  const [availabilityDays, setAvailabilityDays] = useState<BookingDayPreview[]>(
    [],
  )
  const [availabilityRules, setAvailabilityRules] = useState<OpeningRule[]>([])
  const [availabilityOpenDates, setAvailabilityOpenDates] = useState<
    OpenDateEntry[]
  >([])
  const [availabilityClosedDates, setAvailabilityClosedDates] = useState<
    string[]
  >([])
  const [usesOpenDateCalendar, setUsesOpenDateCalendar] = useState(false)
  const [availabilityBusy, setAvailabilityBusy] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const now = new Date()
  const [availabilityYear, setAvailabilityYear] = useState(now.getFullYear())
  const [availabilityMonth, setAvailabilityMonth] = useState(now.getMonth())
  const [bookingsDays, setBookingsDays] = useState<AdminBookingDay[]>([])
  const [bookingsList, setBookingsList] = useState<AdminBooking[]>([])
  const [bookingsBusy, setBookingsBusy] = useState(false)
  const [bookingsError, setBookingsError] = useState<string | null>(null)
  const [bookingsYear, setBookingsYear] = useState(now.getFullYear())
  const [bookingsMonth, setBookingsMonth] = useState(now.getMonth())
  const [bookingsSelectedDate, setBookingsSelectedDate] = useState<string | null>(
    null,
  )
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>([])
  const [ordersSubtab, setOrdersSubtab] = useState<OrdersSubtab>('today')
  const [ordersTimezone, setOrdersTimezone] = useState(RESTAURANT_TIME_ZONE)
  const [ordersHistoryYear, setOrdersHistoryYear] = useState(now.getFullYear())
  const [ordersHistoryMonth, setOrdersHistoryMonth] = useState(now.getMonth())
  const [ordersHistorySelectedDate, setOrdersHistorySelectedDate] = useState<
    string | null
  >(null)
  const [ordersBusy, setOrdersBusy] = useState(false)
  const [ordersBusyItemId, setOrdersBusyItemId] = useState<string | null>(null)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [adminTables, setAdminTables] = useState<AdminTableRow[]>([])
  const [tablesOrders, setTablesOrders] = useState<TableOrderRow[]>([])
  const [tablesMenu, setTablesMenu] = useState<GbMenuItemRow[]>([])
  const [tablesSelectedId, setTablesSelectedId] = useState<string | null>(null)
  const [tablesSubtab, setTablesSubtab] = useState<TablesSubtab>('today')
  const [tablesTimezone, setTablesTimezone] = useState(RESTAURANT_TIME_ZONE)
  const [tablesHistoryYear, setTablesHistoryYear] = useState(now.getFullYear())
  const [tablesHistoryMonth, setTablesHistoryMonth] = useState(now.getMonth())
  const [tablesHistorySelectedDate, setTablesHistorySelectedDate] = useState<
    string | null
  >(null)
  const [tablesBusy, setTablesBusy] = useState(false)
  const [tablesError, setTablesError] = useState<string | null>(null)
  const [instagramUrls, setInstagramUrls] = useState<string[]>(emptyInstagramSlots)
  const [instagramBusy, setInstagramBusy] = useState(false)
  const [takeoutEnabled, setTakeoutEnabled] = useState(true)
  const [takeoutOffers, setTakeoutOffers] = useState<TakeoutCatalogItem[]>([])
  const [takeoutTemplates, setTakeoutTemplates] = useState<TakeoutTemplate[]>([])
  const [takeoutActiveTemplateId, setTakeoutActiveTemplateId] = useState<
    string | null
  >(null)
  const [takeoutBusy, setTakeoutBusy] = useState(false)

  type AdminAccountResponse = {
    username: string
    resetEmail: string
  }

  const loadAvailability = async (year: number, month: number) => {
    const { from, to } = monthBounds(year, month)
    setAvailabilityBusy(true)
    try {
      const data = await api<{
        settings: BookingAvailabilitySettings
        days?: BookingDayPreview[]
        rules?: OpeningRule[]
        openDates?: OpenDateEntry[]
        closedDates?: string[]
        usesOpenDateCalendar?: boolean
        error?: string
      }>(`/api/admin/availability?from=${from}&to=${to}`)
      setAvailabilitySettings(data.settings)
      setAvailabilityDays(data.days ?? [])
      setAvailabilityRules(data.rules ?? [])
      setAvailabilityOpenDates(data.openDates ?? [])
      setAvailabilityClosedDates(data.closedDates ?? [])
      setUsesOpenDateCalendar(Boolean(data.usesOpenDateCalendar))
      setAvailabilityError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'error'
      if (message === 'not-configured') {
        setAvailabilityError('not-configured')
      } else {
        setAvailabilityError(t.adminAvailabilityError)
      }
      setAvailabilitySettings(null)
      setAvailabilityDays([])
      setAvailabilityRules([])
      setAvailabilityOpenDates([])
      setAvailabilityClosedDates([])
      setUsesOpenDateCalendar(false)
    } finally {
      setAvailabilityBusy(false)
    }
  }

  const loadBookings = async (year: number, month: number) => {
    const { from, to } = monthBounds(year, month)
    setBookingsBusy(true)
    try {
      const data = await api<{
        days?: AdminBookingDay[]
        bookings?: AdminBooking[]
        error?: string
      }>(`/api/admin/bookings?from=${from}&to=${to}`)
      setBookingsDays(data.days ?? [])
      setBookingsList(data.bookings ?? [])
      setBookingsError(null)
      setBookingsSelectedDate((current) => {
        if (current && current >= from && current <= to) {
          return current
        }
        return null
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'error'
      if (message === 'not-configured') {
        setBookingsError('not-configured')
      } else {
        setBookingsError(t.adminCalendarError)
      }
      setBookingsDays([])
      setBookingsList([])
    } finally {
      setBookingsBusy(false)
    }
  }

  const loadOrders = async () => {
    setOrdersBusy(true)
    try {
      const data = await api<{ orders?: KitchenOrder[]; timezone?: string }>(
        '/api/admin/orders?include_closed=true',
      )
      setKitchenOrders(Array.isArray(data.orders) ? data.orders : [])
      setOrdersTimezone(
        typeof data.timezone === 'string' && data.timezone.trim()
          ? data.timezone.trim()
          : RESTAURANT_TIME_ZONE,
      )
      setOrdersError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'error'
      if (message === 'not-configured') {
        setOrdersError('not-configured')
      } else {
        setOrdersError(t.adminOrdersError)
      }
      setKitchenOrders([])
    } finally {
      setOrdersBusy(false)
    }
  }

  const mapTableOrderRow = (order: KitchenOrder): TableOrderRow => ({
    id: order.id,
    tableId: order.tableId,
    status: order.status,
    created_at: order.created_at,
    submitted_at: order.submitted_at,
    orderNumber: order.orderNumber,
    items: order.items.map((item) => ({
      id: item.id,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      line_notes: item.line_notes,
      status: item.status,
    })),
  })

  const loadTables = async () => {
    setTablesBusy(true)
    try {
      const [tablesData, menuData] = await Promise.all([
        api<{ tables?: AdminTableRow[]; orders?: KitchenOrder[]; timezone?: string }>(
          '/api/admin/tables',
        ),
        api<{ items?: GbMenuItemRow[] }>('/api/admin/tables/menu'),
      ])
      setAdminTables(Array.isArray(tablesData.tables) ? tablesData.tables : [])
      setTablesOrders(
        Array.isArray(tablesData.orders)
          ? tablesData.orders.map(mapTableOrderRow)
          : [],
      )
      setTablesMenu(Array.isArray(menuData.items) ? menuData.items : [])
      setTablesTimezone(
        typeof tablesData.timezone === 'string' && tablesData.timezone.trim()
          ? tablesData.timezone.trim()
          : RESTAURANT_TIME_ZONE,
      )
      setTablesError(null)
      setTablesSelectedId((current) => {
        if (!current) {
          return current
        }
        return tablesData.tables?.some((table) => table.id === current) ? current : null
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'error'
      if (message === 'not-configured') {
        setTablesError('not-configured')
      } else {
        setTablesError(t.adminTablesError)
      }
      setAdminTables([])
      setTablesOrders([])
      setTablesMenu([])
    } finally {
      setTablesBusy(false)
    }
  }

  const submitTableOrder = async (
    tableId: string,
    items: Array<{ menu_item_id: string; quantity: number; line_notes?: string }>,
  ) => {
    setTablesBusy(true)
    setMessage(null)
    try {
      await api(`/api/admin/tables/${encodeURIComponent(tableId)}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      await loadTables()
    } catch {
      setMessage(t.adminTablesSubmitError)
    } finally {
      setTablesBusy(false)
    }
  }

  const cancelTableOrder = async (orderId: string) => {
    setTablesBusy(true)
    setMessage(null)
    try {
      await api(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      await loadTables()
    } catch {
      setMessage(t.adminTablesUpdateError)
    } finally {
      setTablesBusy(false)
    }
  }

  const removeTableOrderItem = async (
    tableId: string,
    orderId: string,
    itemId: string,
  ) => {
    setTablesBusy(true)
    setMessage(null)
    try {
      await api(
        `/api/admin/tables/${encodeURIComponent(tableId)}/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}`,
        { method: 'DELETE' },
      )
      await loadTables()
    } catch {
      setMessage(t.adminTablesUpdateError)
    } finally {
      setTablesBusy(false)
    }
  }

  const closeTableTab = async (tableId: string, paymentMethod: string) => {
    setTablesBusy(true)
    setMessage(null)
    try {
      await api(`/api/admin/tables/${encodeURIComponent(tableId)}/close-tab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: paymentMethod }),
      })
      await loadTables()
    } catch {
      setMessage(t.adminTablesCloseTabError)
    } finally {
      setTablesBusy(false)
    }
  }

  const patchOrderItemStatus = async (
    orderId: string,
    itemId: string,
    status: KitchenOrderItemStatus,
  ) => {
    setOrdersBusyItemId(itemId)
    setMessage(null)
    try {
      await api(`/api/admin/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await loadOrders()
    } catch {
      setMessage(t.adminOrdersUpdateError)
    } finally {
      setOrdersBusyItemId(null)
    }
  }

  const patchOrderStatus = async (
    orderId: string,
    status: KitchenOrderStatus,
  ) => {
    setOrdersBusy(true)
    setMessage(null)
    try {
      await api(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await loadOrders()
    } catch {
      setMessage(t.adminOrdersUpdateError)
    } finally {
      setOrdersBusy(false)
    }
  }

  const loadInstagram = async () => {
    try {
      const data = await api<{ urls: string[] }>('/api/admin/instagram')
      const urls = Array.isArray(data.urls) ? data.urls : []
      const slots = emptyInstagramSlots()
      for (let index = 0; index < INSTAGRAM_SLOTS; index += 1) {
        slots[index] = typeof urls[index] === 'string' ? urls[index] : ''
      }
      setInstagramUrls(slots)
    } catch {
      setInstagramUrls(emptyInstagramSlots())
    }
  }

  const applyTakeoutCatalog = (catalog: TakeoutCatalog) => {
    const items = Array.isArray(catalog.items) ? catalog.items : []
    const templates = Array.isArray(catalog.templates) ? catalog.templates : []
    setTakeoutEnabled(Boolean(catalog.enabled))
    setTakeoutOffers(items)
    setTakeoutTemplates(templates)
    setTakeoutActiveTemplateId(
      catalog.activeTemplateId ?? activeTemplateIdForOffers(templates, items),
    )
  }

  const loadTakeout = async () => {
    setTakeoutBusy(true)
    try {
      const data = await api<{ catalog: TakeoutCatalog }>('/api/admin/takeout')
      applyTakeoutCatalog(data.catalog ?? { enabled: true, items: [], templates: [], activeTemplateId: null })
    } catch {
      setTakeoutEnabled(true)
      setTakeoutOffers([])
      setTakeoutTemplates([])
      setTakeoutActiveTemplateId(null)
    } finally {
      setTakeoutBusy(false)
    }
  }

  const loadAdminData = async (): Promise<boolean> => {
    const [menuResult, companyResult, accountResult] = await Promise.allSettled([
      api<{ items: StoredMenuItem[] }>('/api/admin/menu'),
      api<{ info: StoredCompanyInfo }>('/api/admin/company'),
      api<AdminAccountResponse>('/api/admin/account'),
    ])

    if (menuResult.status === 'fulfilled') {
      setItems(menuResult.value.items)
    }
    if (companyResult.status === 'fulfilled') {
      setCompanyInfo(companyResult.value.info)
    } else {
      setCompanyInfo(fallbackCompanyInfo())
    }
    if (accountResult.status === 'fulfilled') {
      setAccountUsername(accountResult.value.username)
      setAccountResetEmail(accountResult.value.resetEmail)
    }

    return (
      menuResult.status === 'fulfilled' &&
      companyResult.status === 'fulfilled' &&
      accountResult.status === 'fulfilled'
    )
  }

  useEffect(() => {
    let cancelled = false
    async function boot() {
      normalizeAdminResetUrl()
      const token = resetTokenFromLocation()
      if (token) {
        if (!cancelled) {
          setResetToken(token)
          setLoginView('reset')
          setStatus('login')
        }
        return
      }

      try {
        await api('/api/admin/session')
      } catch {
        if (!cancelled) {
          setStatus('login')
        }
        return
      }

      if (!cancelled) {
        setStatus('ready')
      }

      const loaded = await loadAdminData()
      if (!cancelled && !loaded) {
        setMessage(t.adminDataLoadError)
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (status !== 'ready' || tab !== 'orders') {
      return
    }
    void loadOrders()
    const timer = window.setInterval(() => {
      void loadOrders()
    }, 15_000)
    return () => {
      window.clearInterval(timer)
    }
  }, [ordersSubtab, status, tab])

  useEffect(() => {
    if (status !== 'ready' || tab !== 'tables') {
      return
    }
    void loadTables()
    const timer = window.setInterval(() => {
      void loadTables()
    }, 15_000)
    return () => {
      window.clearInterval(timer)
    }
  }, [status, tab])

  const login = async (event: FormEvent) => {
    event.preventDefault()
    setLoginError(null)
    setLoginMessage(null)
    setMessage(null)
    try {
      await api('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
    } catch {
      setLoginError(t.adminLoginError)
      return
    }

    setStatus('ready')
    const loaded = await loadAdminData()
    if (!loaded) {
      setMessage(t.adminDataLoadError)
    }
  }

  const requestPasswordReset = async (event: FormEvent) => {
    event.preventDefault()
    setLoginError(null)
    setLoginMessage(null)
    try {
      await api('/api/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      setLoginMessage(t.adminForgotSent)
    } catch {
      setLoginError(t.adminForgotError)
    }
  }

  const resetPassword = async (event: FormEvent) => {
    event.preventDefault()
    setLoginError(null)
    setLoginMessage(null)
    if (!resetToken) {
      setLoginError(t.adminResetInvalid)
      return
    }
    try {
      await api('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken,
          password: newPassword,
          confirm: confirmPassword,
        }),
      })
      setLoginMessage(t.adminResetDone)
      setLoginView('sign-in')
      setResetToken('')
      setNewPassword('')
      setConfirmPassword('')
      window.history.replaceState({}, '', '/admin')
      await api('/api/admin/logout', { method: 'POST' }).catch(() => undefined)
    } catch {
      setLoginError(t.adminResetError)
    }
  }

  const logout = async () => {
    await api('/api/admin/logout', { method: 'POST' })
    setItems([])
    setDrafts({})
    setCompanyDraft(null)
    setAccountCurrentPassword('')
    setAccountNewPassword('')
    setAccountConfirmPassword('')
    setTab('menu')
    setStatus('login')
  }

  const saveAccountEmail = async () => {
    setAccountEmailBusy(true)
    setMessage(null)
    try {
      const data = await api<{ resetEmail: string }>('/api/admin/account/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: accountResetEmail }),
      })
      setAccountResetEmail(data.resetEmail)
      setMessage(t.adminAccountEmailSaved)
    } catch {
      setMessage(t.adminAccountEmailError)
    } finally {
      setAccountEmailBusy(false)
    }
  }

  const saveAccountPassword = async () => {
    setAccountPasswordBusy(true)
    setMessage(null)
    try {
      await api('/api/admin/account/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: accountCurrentPassword,
          password: accountNewPassword,
          confirm: accountConfirmPassword,
        }),
      })
      setAccountCurrentPassword('')
      setAccountNewPassword('')
      setAccountConfirmPassword('')
      setMessage(t.adminAccountPasswordSaved)
    } catch (error) {
      if (error instanceof Error && error.message === 'wrong-password') {
        setMessage(t.adminAccountWrongPassword)
      } else {
        setMessage(t.adminAccountPasswordError)
      }
    } finally {
      setAccountPasswordBusy(false)
    }
  }

  const currentCompany = companyDraft ?? companyInfo

  const saveCompanyInfo = async () => {
    setCompanyBusy(true)
    setMessage(null)
    try {
      const data = await api<{ info: StoredCompanyInfo }>('/api/admin/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentCompany),
      })
      setCompanyInfo(data.info)
      setCompanyDraft(null)
      setMessage(t.adminSaved)
    } catch {
      setMessage(t.adminSaveError)
    } finally {
      setCompanyBusy(false)
    }
  }

  const saveAvailability = async () => {
    if (!availabilitySettings) {
      return
    }
    setAvailabilityBusy(true)
    setMessage(null)
    try {
      const data = await api<{ settings: BookingAvailabilitySettings }>(
        '/api/admin/availability',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            opensAt: availabilitySettings.opens_at,
            closesAt: availabilitySettings.closes_at,
            slotIntervalMinutes: availabilitySettings.slot_interval_minutes,
            defaultTurnMinutes: availabilitySettings.default_turn_minutes,
            timezone: availabilitySettings.timezone,
          }),
        },
      )
      setAvailabilitySettings(data.settings)
      setMessage(t.adminAvailabilitySaved)
      await loadAvailability(availabilityYear, availabilityMonth)
    } catch {
      setMessage(t.adminAvailabilityError)
    } finally {
      setAvailabilityBusy(false)
    }
  }

  const createOpeningRule = async (input: {
    name: string
    opensAt: string
    closesAt: string
  }) => {
    setAvailabilityBusy(true)
    setMessage(null)
    try {
      await api('/api/admin/opening-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      setMessage(t.adminOpenRuleCreated)
      await loadAvailability(availabilityYear, availabilityMonth)
    } catch {
      setMessage(t.adminAvailabilityError)
    } finally {
      setAvailabilityBusy(false)
    }
  }

  const deleteOpeningRule = async (id: string) => {
    setAvailabilityBusy(true)
    setMessage(null)
    try {
      await api('/api/admin/opening-rules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setMessage(t.adminOpenRuleDeleted)
      await loadAvailability(availabilityYear, availabilityMonth)
    } catch {
      setMessage(t.adminAvailabilityError)
    } finally {
      setAvailabilityBusy(false)
    }
  }

  const applyOpenDates = async (ruleId: string, dates: string[]) => {
    setAvailabilityBusy(true)
    setMessage(null)
    try {
      await api('/api/admin/open-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId, dates }),
      })
      setMessage(t.adminOpenDatesApplied)
      await loadAvailability(availabilityYear, availabilityMonth)
    } catch {
      setMessage(t.adminAvailabilityError)
    } finally {
      setAvailabilityBusy(false)
    }
  }

  const clearOpenDates = async (dates: string[]) => {
    setAvailabilityBusy(true)
    setMessage(null)
    try {
      await api('/api/admin/open-dates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates }),
      })
      setMessage(t.adminOpenDatesCleared)
      await loadAvailability(availabilityYear, availabilityMonth)
    } catch {
      setMessage(t.adminAvailabilityError)
    } finally {
      setAvailabilityBusy(false)
    }
  }

  const toggleBookingStatus = async (date: string, open: boolean) => {
    setAvailabilityBusy(true)
    setMessage(null)
    try {
      const data = await api<{ closedDates: string[] }>(
        '/api/admin/booking-status',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, open }),
        },
      )
      setAvailabilityClosedDates(data.closedDates ?? [])
      setMessage(
        open ? t.adminBookingStatusOpened : t.adminBookingStatusClosedSaved,
      )
      await loadAvailability(availabilityYear, availabilityMonth)
    } catch {
      setMessage(t.adminAvailabilityError)
    } finally {
      setAvailabilityBusy(false)
    }
  }

  const saveInstagram = async () => {
    setInstagramBusy(true)
    setMessage(null)
    try {
      const data = await api<{ urls: string[]; error?: string }>(
        '/api/admin/instagram',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: instagramUrls }),
        },
      )
      const urls = Array.isArray(data.urls) ? data.urls : []
      const slots = emptyInstagramSlots()
      for (let index = 0; index < INSTAGRAM_SLOTS; index += 1) {
        slots[index] = typeof urls[index] === 'string' ? urls[index] : ''
      }
      setInstagramUrls(slots)
      setMessage(t.adminInstagramSaved)
    } catch (error) {
      const err = error instanceof Error ? error.message : ''
      if (err.startsWith('invalid-url-')) {
        setMessage(t.adminInstagramInvalid)
      } else {
        setMessage(t.adminInstagramError)
      }
    } finally {
      setInstagramBusy(false)
    }
  }

  const saveTakeout = async (snapshot?: TakeoutPersistInput) => {
    const catalog: TakeoutPersistInput = snapshot ?? {
      enabled: takeoutEnabled,
      items: takeoutOffers,
      templates: takeoutTemplates,
      activeTemplateId: takeoutActiveTemplateId,
    }
    const switchedMode =
      Boolean(snapshot) && !takeoutOffersMatch(catalog.items, takeoutOffers)
    setTakeoutBusy(true)
    setMessage(null)
    applyTakeoutCatalog({
      enabled: catalog.enabled,
      items: catalog.items,
      templates: catalog.templates,
      activeTemplateId: catalog.activeTemplateId,
    })
    try {
      const data = await api<{ catalog: TakeoutCatalog }>('/api/admin/takeout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalog,
        }),
      })
      applyTakeoutCatalog(
        data.catalog ?? {
          enabled: catalog.enabled,
          items: catalog.items,
          templates: catalog.templates,
          activeTemplateId: catalog.activeTemplateId,
        },
      )
      const active = (data.catalog?.templates ?? catalog.templates).find(
        (template) =>
          template.id ===
          (data.catalog?.activeTemplateId ?? catalog.activeTemplateId),
      )
      setMessage(
        switchedMode && active
          ? t.adminTakeoutActivated.replace('{name}', active.name)
          : t.adminTakeoutSaved,
      )
    } catch {
      setMessage(t.adminTakeoutError)
    } finally {
      setTakeoutBusy(false)
    }
  }

  const current = (item: StoredMenuItem) => drafts[item.id || 'new'] ?? item

  const newDishDraft = () =>
    current(emptyItem((items.at(-1)?.sort_order ?? 0) + 10))

  const openNewDish = () => {
    setDrafts((prev) => ({
      ...prev,
      new: emptyItem((items.at(-1)?.sort_order ?? 0) + 10),
    }))
    setDishStatus((prev) => {
      const next = { ...prev }
      delete next.new
      return next
    })
    setNewDishOpen(true)
  }

  const closeNewDish = () => {
    if (busyId === 'new') {
      return
    }
    setNewDishOpen(false)
    setDrafts((prev) => {
      const next = { ...prev }
      delete next.new
      return next
    })
  }

  const closeNewCategory = () => {
    if (categoryBusy) {
      return
    }
    setNewCategoryOpen(false)
    setCategoryName('')
  }

  const openNewCategory = async () => {
    setCategoryStatus(null)
    setNewCategoryOpen(true)
    setCategoryBusy(true)
    try {
      const data = await api<{
        categories?: Array<{ id: string; name: string; sort_order: number }>
      }>('/api/admin/menu/categories')
      const rows = Array.isArray(data.categories) ? data.categories : []
      setKitchenCategories(rows)
      const nextSort =
        rows.reduce((max, row) => Math.max(max, row.sort_order ?? 0), 0) + 10
      setCategorySort(String(nextSort))
      setCategoryName('')
    } catch {
      setKitchenCategories([])
      setCategorySort('0')
    } finally {
      setCategoryBusy(false)
    }
  }

  const saveNewCategory = async () => {
    const name = categoryName.trim()
    if (!name) {
      setCategoryStatus(t.adminAddCategoryError)
      return
    }
    setCategoryBusy(true)
    setCategoryStatus(null)
    try {
      const data = await api<{
        category: { id: string; name: string; sort_order: number }
      }>('/api/admin/menu/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          sort_order: Number.parseInt(categorySort, 10) || 0,
        }),
      })
      setNewCategoryOpen(false)
      setCategoryName('')
      setCategoryStatus(
        t.adminAddCategoryDone.replace('{name}', data.category.name),
      )
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      setCategoryStatus(
        code === 'not-configured'
          ? t.adminPullKitchenInventoryMissing
          : t.adminAddCategoryError,
      )
    } finally {
      setCategoryBusy(false)
    }
  }

  useEffect(() => {
    if (!newDishOpen && !newCategoryOpen) {
      return
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      if (newDishOpen) {
        closeNewDish()
      }
      if (newCategoryOpen) {
        closeNewCategory()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [newDishOpen, newCategoryOpen, busyId, categoryBusy])

  const jumpToMenuItem = (id: string) => {
    setMenuFocusId(id)
    jumpToMenuElement(dishDomId(id))
  }

  const pullKitchenInventory = async () => {
    setInventoryBusy(true)
    setInventoryStatus(null)
    try {
      const data = await api<{
        items: StoredMenuItem[]
        updated: number
        created: number
      }>('/api/admin/menu/import-inventory', { method: 'POST' })
      setItems(data.items)
      setDrafts({})
      setDishStatus({})
      setInventoryStatus(
        t.adminPullKitchenInventoryDone
          .replace('{updated}', String(data.updated))
          .replace('{created}', String(data.created)),
      )
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      setInventoryStatus(
        code === 'not-configured'
          ? t.adminPullKitchenInventoryMissing
          : t.adminPullKitchenInventoryError,
      )
    } finally {
      setInventoryBusy(false)
    }
  }

  const saveItem = async (item: StoredMenuItem) => {
    const key = item.id || 'new'
    setBusyId(key)
    setDishStatus((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    try {
      const data = await api<{
        item: StoredMenuItem
        inventoryPriceCents?: number | null
        inventoryError?: boolean
      }>('/api/admin/menu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
      setItems((prev) => {
        if (!item.id) {
          return [...prev, data.item]
        }
        return prev.map((row) => (row.id === data.item.id ? data.item : row))
      })
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      const statusKey = data.item.id || key
      const kitchenPrice =
        typeof data.inventoryPriceCents === 'number' && data.inventoryPriceCents > 0
          ? formatEuros(data.inventoryPriceCents, locale)
          : null
      setDishStatus((prev) => ({
        ...prev,
        [statusKey]: data.inventoryError
          ? t.adminSavedKitchenError
          : kitchenPrice
            ? t.adminSavedKitchen.replace('{price}', kitchenPrice)
            : t.adminSaved,
      }))
      if (!item.id) {
        setNewDishOpen(false)
        setMenuFocusId(data.item.id)
        window.requestAnimationFrame(() => {
          document.getElementById(dishDomId(data.item.id))?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
        })
      }
    } catch {
      setDishStatus((prev) => ({ ...prev, [key]: t.adminSaveError }))
    } finally {
      setBusyId(null)
    }
  }

  const deleteItem = async (item: StoredMenuItem) => {
    if (!item.id || !window.confirm(t.adminDeleteConfirm)) {
      return
    }
    setBusyId(item.id)
    setMessage(null)
    try {
      await api(`/api/admin/menu?id=${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
      })
      setItems((prev) => prev.filter((row) => row.id !== item.id))
      setMessage(t.adminDeleted)
    } catch {
      setMessage(t.adminSaveError)
    } finally {
      setBusyId(null)
    }
  }

  const uploadPhoto = async (item: StoredMenuItem, file: File) => {
    const key = item.id || 'new'
    setBusyId(key)
    setMessage(null)
    try {
      const form = new FormData()
      form.set('file', file)
      const data = await api<{ url: string }>('/api/admin/photo', {
        method: 'POST',
        body: form,
      })
      const next = { ...current(item), image_url: data.url }
      setDrafts((prev) => ({ ...prev, [key]: next }))
      if (item.id) {
        await saveItem(next)
      }
    } catch {
      setMessage(t.adminPhotoError)
    } finally {
      if (!item.id) {
        setBusyId(null)
      }
    }
  }

  return (
    <>
      <a className="skip-link" href="#contenido">
        {t.adminTitle}
      </a>
      <header className="site-header admin-header">
        <div className="header-inner">
          <a className="brand" href="/" onClick={onHome}>
            <img
              className="nav-logo"
              src="/images/nav-logo.png"
              alt={restaurant.name}
              width={72}
              height={72}
            />
          </a>
          <div className="header-actions">
            <span className="header-carta">{t.adminTitle}</span>
            <LanguagePicker locale={locale} onChange={onLocaleChange} />
            {status === 'ready' ? (
              <button type="button" className="btn btn-small" onClick={() => void logout()}>
                {t.adminLogout}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main id="contenido" className="admin-main">
        <article className="carta-page">
          <div className="section-inner">
            <header className="section-head">
              <p className="kicker">{t.adminTitle}</p>
              {status === 'ready' ? (
                <>
                  <h1>{adminHeading(t, tab)}</h1>
                  <p className="lead muted">{adminLead(t, tab)}</p>
                </>
              ) : status === 'login' ? (
                <>
                  <h1>{loginHeading(t, loginView)}</h1>
                  <p className="lead muted">{loginLead(t, loginView)}</p>
                </>
              ) : null}
            </header>

            {status === 'ready' ? (
              <div className="admin-tabs" role="tablist" aria-label={t.adminTitle}>
                <button
                  type="button"
                  role="tab"
                  className={`admin-tab${tab === 'menu' ? ' is-active' : ''}`}
                  aria-selected={tab === 'menu'}
                  onClick={() => setTab('menu')}
                >
                  {t.adminTabMenu}
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`admin-tab${tab === 'account' ? ' is-active' : ''}`}
                  aria-selected={tab === 'account'}
                  onClick={() => setTab('account')}
                >
                  {t.adminTabAccount}
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`admin-tab${tab === 'restaurant' ? ' is-active' : ''}`}
                  aria-selected={tab === 'restaurant'}
                  onClick={() => setTab('restaurant')}
                >
                  {t.adminTabRestaurant}
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`admin-tab${tab === 'availability' ? ' is-active' : ''}`}
                  aria-selected={tab === 'availability'}
                  onClick={() => {
                    setTab('availability')
                    void loadAvailability(availabilityYear, availabilityMonth)
                  }}
                >
                  {t.adminTabAvailability}
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`admin-tab${tab === 'calendar' ? ' is-active' : ''}`}
                  aria-selected={tab === 'calendar'}
                  onClick={() => {
                    setTab('calendar')
                    void loadBookings(bookingsYear, bookingsMonth)
                  }}
                >
                  {t.adminTabCalendar}
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`admin-tab${tab === 'orders' ? ' is-active' : ''}`}
                  aria-selected={tab === 'orders'}
                  onClick={() => {
                    setTab('orders')
                    void loadOrders()
                  }}
                >
                  {t.adminTabOrders}
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`admin-tab${tab === 'tables' ? ' is-active' : ''}`}
                  aria-selected={tab === 'tables'}
                  onClick={() => {
                    setTab('tables')
                    void loadTables()
                  }}
                >
                  {t.adminTabTables}
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`admin-tab${tab === 'takeout' ? ' is-active' : ''}`}
                  aria-selected={tab === 'takeout'}
                  onClick={() => {
                    setTab('takeout')
                    void loadTakeout()
                  }}
                >
                  {t.adminTabTakeout}
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`admin-tab${tab === 'instagram' ? ' is-active' : ''}`}
                  aria-selected={tab === 'instagram'}
                  onClick={() => {
                    setTab('instagram')
                    void loadInstagram()
                  }}
                >
                  {t.adminTabInstagram}
                </button>
              </div>
            ) : null}

            {status === 'loading' ? <p className="muted">{t.adminLoading}</p> : null}

            {status === 'login' ? (
              <>
                {loginView === 'sign-in' ? (
                  <form
                    className="takeout-form admin-login"
                    onSubmit={(event) => void login(event)}
                  >
                    <label className="takeout-field">
                      <span>{t.adminUser}</span>
                      <input
                        autoComplete="username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                      />
                    </label>
                    <label className="takeout-field">
                      <span>{t.adminPassword}</span>
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </label>
                    {loginError ? (
                      <p className="takeout-error">{loginError}</p>
                    ) : null}
                    {loginMessage ? (
                      <p className="admin-message">{loginMessage}</p>
                    ) : null}
                    <button className="btn" type="submit">
                      {t.adminSignIn}
                    </button>
                    <p className="admin-login-alt">
                      <button
                        type="button"
                        className="admin-link-button"
                        onClick={() => {
                          setLoginView('forgot')
                          setLoginError(null)
                          setLoginMessage(null)
                        }}
                      >
                        {t.adminForgotPassword}
                      </button>
                    </p>
                  </form>
                ) : null}

                {loginView === 'forgot' ? (
                  <form
                    className="takeout-form admin-login"
                    onSubmit={(event) => void requestPasswordReset(event)}
                  >
                    <label className="takeout-field">
                      <span>{t.adminUser}</span>
                      <input
                        autoComplete="username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                      />
                    </label>
                    {loginError ? (
                      <p className="takeout-error">{loginError}</p>
                    ) : null}
                    {loginMessage ? (
                      <p className="admin-message">{loginMessage}</p>
                    ) : null}
                    <button className="btn" type="submit">
                      {t.adminForgotSubmit}
                    </button>
                    <p className="admin-login-alt">
                      <button
                        type="button"
                        className="admin-link-button"
                        onClick={() => {
                          setLoginView('sign-in')
                          setLoginError(null)
                          setLoginMessage(null)
                        }}
                      >
                        {t.adminBackToSignIn}
                      </button>
                    </p>
                  </form>
                ) : null}

                {loginView === 'reset' ? (
                  resetToken ? (
                    <form
                      className="takeout-form admin-login"
                      onSubmit={(event) => void resetPassword(event)}
                    >
                      <label className="takeout-field">
                        <span>{t.adminResetPassword}</span>
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(event) =>
                            setNewPassword(event.target.value)
                          }
                        />
                      </label>
                      <label className="takeout-field">
                        <span>{t.adminResetConfirm}</span>
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(event) =>
                            setConfirmPassword(event.target.value)
                          }
                        />
                      </label>
                      {loginError ? (
                        <p className="takeout-error">{loginError}</p>
                      ) : null}
                      {loginMessage ? (
                        <p className="admin-message">{loginMessage}</p>
                      ) : null}
                      <button className="btn" type="submit">
                        {t.adminResetSubmit}
                      </button>
                      <p className="admin-login-alt">
                        <button
                          type="button"
                          className="admin-link-button"
                          onClick={() => {
                            setLoginView('sign-in')
                            setResetToken('')
                            setLoginError(null)
                            setLoginMessage(null)
                            window.history.replaceState({}, '', '/admin')
                            void api('/api/admin/logout', { method: 'POST' }).catch(
                              () => undefined,
                            )
                          }}
                        >
                          {t.adminBackToSignIn}
                        </button>
                      </p>
                    </form>
                  ) : (
                    <div className="takeout-form admin-login">
                      <p className="takeout-error">{t.adminResetInvalid}</p>
                      <button
                        className="btn btn-outline"
                        type="button"
                        onClick={() => setLoginView('sign-in')}
                      >
                        {t.adminBackToSignIn}
                      </button>
                    </div>
                  )
                ) : null}
              </>
            ) : null}

            {status === 'ready' ? (
              <>
                {message ? <p className="admin-message">{message}</p> : null}
                {tab === 'restaurant' ? (
                  <CompanyInfoEditor
                    info={currentCompany}
                    t={t}
                    busy={companyBusy}
                    onChange={setCompanyDraft}
                    onSave={() => void saveCompanyInfo()}
                  />
                ) : null}
                {tab === 'availability' ? (
                  <AvailabilityEditor
                    settings={availabilitySettings}
                    days={availabilityDays}
                    rules={availabilityRules}
                    openDates={availabilityOpenDates}
                    closedDates={availabilityClosedDates}
                    usesOpenDateCalendar={usesOpenDateCalendar}
                    year={availabilityYear}
                    month={availabilityMonth}
                    busy={availabilityBusy}
                    loadError={availabilityError}
                    t={t}
                    onChange={setAvailabilitySettings}
                    onSave={() => void saveAvailability()}
                    onMonthChange={(year, month) => {
                      setAvailabilityYear(year)
                      setAvailabilityMonth(month)
                      void loadAvailability(year, month)
                    }}
                    onCreateRule={createOpeningRule}
                    onDeleteRule={deleteOpeningRule}
                    onApplyDates={applyOpenDates}
                    onClearDates={clearOpenDates}
                    onToggleBookingStatus={toggleBookingStatus}
                  />
                ) : null}
                {tab === 'calendar' ? (
                  <BookingsCalendarEditor
                    days={bookingsDays}
                    bookings={bookingsList}
                    year={bookingsYear}
                    month={bookingsMonth}
                    selectedDate={bookingsSelectedDate}
                    busy={bookingsBusy}
                    loadError={bookingsError}
                    t={t}
                    onMonthChange={(year, month) => {
                      setBookingsYear(year)
                      setBookingsMonth(month)
                      void loadBookings(year, month)
                    }}
                    onSelectDate={setBookingsSelectedDate}
                  />
                ) : null}
                {tab === 'orders' ? (
                  <OrdersKitchenEditor
                    orders={kitchenOrders}
                    subtab={ordersSubtab}
                    timeZone={ordersTimezone}
                    historyYear={ordersHistoryYear}
                    historyMonth={ordersHistoryMonth}
                    historySelectedDate={ordersHistorySelectedDate}
                    busy={ordersBusy}
                    busyItemId={ordersBusyItemId}
                    loadError={ordersError}
                    t={t}
                    onSubtabChange={setOrdersSubtab}
                    onHistoryMonthChange={(year, month) => {
                      setOrdersHistoryYear(year)
                      setOrdersHistoryMonth(month)
                      setOrdersHistorySelectedDate((current) => {
                        if (!current) {
                          return current
                        }
                        const { from, to } = monthBounds(year, month)
                        if (current >= from && current <= to) {
                          return current
                        }
                        return null
                      })
                    }}
                    onHistorySelectDate={setOrdersHistorySelectedDate}
                    onRefresh={() => void loadOrders()}
                    onItemStatus={(orderId, itemId, status) =>
                      void patchOrderItemStatus(orderId, itemId, status)
                    }
                    onOrderStatus={(orderId, status) =>
                      void patchOrderStatus(orderId, status)
                    }
                  />
                ) : null}
                {tab === 'tables' ? (
                  <AdminTablesEditor
                    tables={adminTables}
                    orders={tablesOrders}
                    menuItems={tablesMenu}
                    subtab={tablesSubtab}
                    timeZone={tablesTimezone}
                    historyYear={tablesHistoryYear}
                    historyMonth={tablesHistoryMonth}
                    historySelectedDate={tablesHistorySelectedDate}
                    selectedTableId={tablesSelectedId}
                    busy={tablesBusy}
                    loadError={tablesError}
                    t={t}
                    onSubtabChange={setTablesSubtab}
                    onHistoryMonthChange={(year, month) => {
                      setTablesHistoryYear(year)
                      setTablesHistoryMonth(month)
                      setTablesHistorySelectedDate((current) => {
                        if (!current) {
                          return current
                        }
                        const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
                        const lastDay = new Date(year, month + 1, 0).getDate()
                        const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
                        if (current >= from && current <= to) {
                          return current
                        }
                        return null
                      })
                      setTablesSelectedId(null)
                    }}
                    onHistorySelectDate={(date) => {
                      setTablesHistorySelectedDate(date)
                      setTablesSelectedId(null)
                    }}
                    onSelectTable={setTablesSelectedId}
                    onRefresh={() => void loadTables()}
                    onSubmitOrder={(tableId, items) =>
                      void submitTableOrder(tableId, items)
                    }
                    onCancelOrder={(orderId) => void cancelTableOrder(orderId)}
                    onRemoveItem={(tableId, orderId, itemId) =>
                      void removeTableOrderItem(tableId, orderId, itemId)
                    }
                    onCloseTab={(tableId, paymentMethod) =>
                      void closeTableTab(tableId, paymentMethod)
                    }
                  />
                ) : null}
                {tab === 'takeout' ? (
                  <TakeoutCatalogEditor
                    items={items}
                    enabled={takeoutEnabled}
                    offers={takeoutOffers}
                    templates={takeoutTemplates}
                    activeTemplateId={takeoutActiveTemplateId}
                    busy={takeoutBusy}
                    t={t}
                    onEnabledChange={setTakeoutEnabled}
                    onSave={() => void saveTakeout()}
                    onPersist={(catalog) => void saveTakeout(catalog)}
                  />
                ) : null}
                {tab === 'instagram' ? (
                  <InstagramEditor
                    urls={instagramUrls}
                    busy={instagramBusy}
                    t={t}
                    onChange={setInstagramUrls}
                    onSave={() => void saveInstagram()}
                  />
                ) : null}
                {tab === 'account' ? (
                  <AccountInfoEditor
                    accountUsername={accountUsername}
                    resetEmail={accountResetEmail}
                    currentPassword={accountCurrentPassword}
                    newPassword={accountNewPassword}
                    confirmPassword={accountConfirmPassword}
                    onResetEmailChange={setAccountResetEmail}
                    onCurrentPasswordChange={setAccountCurrentPassword}
                    onNewPasswordChange={setAccountNewPassword}
                    onConfirmPasswordChange={setAccountConfirmPassword}
                    onSaveEmail={() => void saveAccountEmail()}
                    onSavePassword={() => void saveAccountPassword()}
                    emailBusy={accountEmailBusy}
                    passwordBusy={accountPasswordBusy}
                    t={t}
                  />
                ) : null}
                {tab === 'menu' ? (
                  <div className="admin-menu-page">
                    <div
                      className="admin-tabs admin-subtabs"
                      role="tablist"
                      aria-label={t.adminMenuNav}
                    >
                      <button
                        type="button"
                        role="tab"
                        className={`admin-tab${menuSubtab === 'cards' ? ' is-active' : ''}`}
                        aria-selected={menuSubtab === 'cards'}
                        onClick={() => setMenuSubtab('cards')}
                      >
                        {t.adminMenuSubtabCards}
                      </button>
                      <button
                        type="button"
                        role="tab"
                        className={`admin-tab${menuSubtab === 'grid' ? ' is-active' : ''}`}
                        aria-selected={menuSubtab === 'grid'}
                        onClick={() => setMenuSubtab('grid')}
                      >
                        {t.adminMenuSubtabGrid}
                      </button>
                    </div>
                    <section className="carta-section admin-menu-inventory">
                      <p className="muted">{t.adminPullKitchenInventoryLead}</p>
                      <div className="admin-dish-actions">
                        <button
                          className="btn"
                          type="button"
                          disabled={inventoryBusy || busyId === 'new'}
                          onClick={openNewDish}
                        >
                          {t.adminAddItem}
                        </button>
                        <button
                          className="btn btn-outline"
                          type="button"
                          disabled={inventoryBusy || categoryBusy}
                          onClick={() => void openNewCategory()}
                        >
                          {t.adminAddCategory}
                        </button>
                        <button
                          className="btn btn-outline"
                          type="button"
                          disabled={inventoryBusy}
                          onClick={() => void pullKitchenInventory()}
                        >
                          {inventoryBusy
                            ? t.adminLoading
                            : t.adminPullKitchenInventory}
                        </button>
                      </div>
                      {inventoryStatus ? (
                        <p className="admin-dish-status">{inventoryStatus}</p>
                      ) : null}
                      {categoryStatus ? (
                        <p className="admin-dish-status">{categoryStatus}</p>
                      ) : null}
                    </section>
                    {menuSubtab === 'grid' ? (
                      <AdminMenuGrid
                        items={items.map((item) => current(item))}
                        t={t}
                        busyId={busyId}
                        dishStatus={dishStatus}
                        onChange={(next) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [next.id || 'new']: next,
                          }))
                        }
                        onSave={(item) => void saveItem(item)}
                        onDelete={(item) => void deleteItem(item)}
                        onPhoto={(item, file) => void uploadPhoto(item, file)}
                      />
                    ) : (
                      <div className="admin-menu-layout">
                        <AdminMenuNav
                          items={items.map((item) => current(item))}
                          currentId={menuFocusId}
                          t={t}
                          onJump={jumpToMenuItem}
                        />
                        <div className="admin-menu-body">
                          {MENU_CATEGORY_IDS.map((categoryId) => {
                            const rows = items.filter(
                              (item) => item.category_id === categoryId,
                            )
                            return (
                              <section
                                className="carta-section"
                                id={`admin-menu-cat-${categoryId}`}
                                key={categoryId}
                              >
                                <h2>{t.cartaCategories[categoryId]}</h2>
                                {rows.length === 0 ? (
                                  <p className="muted">{t.adminEmptyCategory}</p>
                                ) : null}
                                {rows.map((item) => (
                                  <DishEditor
                                    key={item.id}
                                    item={current(item)}
                                    t={t}
                                    busy={busyId === item.id}
                                    status={dishStatus[item.id] ?? null}
                                    highlighted={menuFocusId === item.id}
                                    onChange={(next) =>
                                      setDrafts((prev) => ({
                                        ...prev,
                                        [item.id]: next,
                                      }))
                                    }
                                    onSave={() => void saveItem(current(item))}
                                    onDelete={() => void deleteItem(item)}
                                    onPhoto={(file) =>
                                      void uploadPhoto(current(item), file)
                                    }
                                  />
                                ))}
                              </section>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {newDishOpen ? (
                      <div
                        className="admin-modal-overlay"
                        role="presentation"
                        onClick={() => closeNewDish()}
                      >
                        <div
                          className="admin-modal"
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby="admin-new-dish-title"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="admin-modal-head">
                            <div>
                              <h2 id="admin-new-dish-title">{t.adminNewDish}</h2>
                              <p className="muted">{t.adminAddItemLead}</p>
                            </div>
                            <button
                              type="button"
                              className="btn btn-outline btn-small"
                              disabled={busyId === 'new'}
                              onClick={closeNewDish}
                            >
                              {t.adminClose}
                            </button>
                          </div>
                          <DishEditor
                            item={newDishDraft()}
                            t={t}
                            busy={busyId === 'new'}
                            status={dishStatus.new ?? null}
                            highlighted={false}
                            onChange={(next) =>
                              setDrafts((prev) => ({ ...prev, new: next }))
                            }
                            onSave={() => void saveItem(newDishDraft())}
                            onDelete={() => undefined}
                            onPhoto={(file) =>
                              void uploadPhoto(newDishDraft(), file)
                            }
                          />
                        </div>
                      </div>
                    ) : null}
                    {newCategoryOpen ? (
                      <div
                        className="admin-modal-overlay"
                        role="presentation"
                        onClick={() => closeNewCategory()}
                      >
                        <div
                          className="admin-modal"
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby="admin-new-category-title"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="admin-modal-head">
                            <div>
                              <h2 id="admin-new-category-title">
                                {t.adminAddCategory}
                              </h2>
                              <p className="muted">{t.adminAddCategoryLead}</p>
                            </div>
                            <button
                              type="button"
                              className="btn btn-outline btn-small"
                              disabled={categoryBusy}
                              onClick={closeNewCategory}
                            >
                              {t.adminClose}
                            </button>
                          </div>
                          <div className="admin-dish-fields">
                            <label className="takeout-field">
                              <span>{t.adminKitchenCategoryName}</span>
                              <input
                                value={categoryName}
                                disabled={categoryBusy}
                                onChange={(event) =>
                                  setCategoryName(event.target.value)
                                }
                              />
                            </label>
                            <label className="takeout-field">
                              <span>{t.adminSort}</span>
                              <input
                                type="number"
                                value={categorySort}
                                disabled={categoryBusy}
                                onChange={(event) =>
                                  setCategorySort(event.target.value)
                                }
                              />
                            </label>
                            <div className="admin-dish-actions">
                              <button
                                className="btn"
                                type="button"
                                disabled={categoryBusy || !categoryName.trim()}
                                onClick={() => void saveNewCategory()}
                              >
                                {categoryBusy ? t.adminLoading : t.adminSave}
                              </button>
                            </div>
                            {categoryStatus && newCategoryOpen ? (
                              <p className="admin-dish-status">{categoryStatus}</p>
                            ) : null}
                            {kitchenCategories.length > 0 ? (
                              <div className="admin-kitchen-cats">
                                <p className="muted">{t.adminKitchenCategories}</p>
                                <ul>
                                  {kitchenCategories
                                    .slice()
                                    .sort(
                                      (left, right) =>
                                        left.sort_order - right.sort_order ||
                                        left.name.localeCompare(right.name),
                                    )
                                    .map((row) => (
                                      <li key={row.id}>{row.name}</li>
                                    ))}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}

            <p className="carta-back">
              <a href="/" onClick={onHome}>
                {t.cartaBackHome}
              </a>
            </p>
          </div>
        </article>
      </main>
    </>
  )
}
