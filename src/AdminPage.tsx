import { useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import {
  MENU_CATEGORY_IDS,
  isMenuCategoryId,
  slugFromName,
  type StoredMenuItem,
} from './menu.ts'
import { restaurant } from './content.ts'
import { AllergenIcon } from './AllergenIcon.tsx'
import { ALLERGEN_IDS, toggleAllergen } from './allergens.ts'
import {
  fallbackCompanyInfo,
  WEEKDAY_LABELS_ES,
  type StoredCompanyInfo,
} from './companyInfo.ts'
import { LanguagePicker } from './LanguagePicker.tsx'
import { type Copy, type Locale } from './i18n/index.ts'

type AdminStatus = 'loading' | 'login' | 'ready'
type AdminTab = 'menu' | 'account' | 'restaurant' | 'availability' | 'instagram'
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

function DishEditor({
  item,
  t,
  onChange,
  onSave,
  onDelete,
  onPhoto,
  busy,
}: {
  item: StoredMenuItem
  t: Copy
  onChange: (item: StoredMenuItem) => void
  onSave: () => void
  onDelete: () => void
  onPhoto: (file: File) => void
  busy: boolean
}) {
  const set = (patch: Partial<StoredMenuItem>) => {
    onChange({ ...item, ...patch })
  }

  return (
    <article className="admin-dish">
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
              value={
                item.price_cents > 0 ? (item.price_cents / 100).toFixed(2) : ''
              }
              onChange={(event) => {
                const euros = Number(event.target.value.replace(',', '.'))
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
      </div>
    </article>
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

function AvailabilityEditor({
  settings,
  days,
  year,
  month,
  busy,
  loadError,
  t,
  onChange,
  onSave,
  onMonthChange,
}: {
  settings: BookingAvailabilitySettings | null
  days: BookingDayPreview[]
  year: number
  month: number
  busy: boolean
  loadError: string | null
  t: Copy
  onChange: (next: BookingAvailabilitySettings) => void
  onSave: () => void
  onMonthChange: (year: number, month: number) => void
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

  return (
    <section className="admin-company takeout-form">
      {loadError ? <p className="takeout-error">{loadError}</p> : null}

      <fieldset className="admin-company-block">
        <legend>{t.adminAvailabilityHeading}</legend>
        <p className="muted">{settings.name} · {settings.slug}</p>
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
                patch({ slot_interval_minutes: Number(event.target.value) || 1 })
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
                patch({ default_turn_minutes: Number(event.target.value) || 1 })
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
      </fieldset>

      <div className="admin-dish-actions">
        <button className="btn" type="button" disabled={busy} onClick={onSave}>
          {t.adminAvailabilitySave}
        </button>
      </div>

      <fieldset className="admin-company-block">
        <legend>{t.adminAvailabilityPreview}</legend>
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
            const closed = row?.closed ?? true
            const slots = row?.slot_count ?? 0
            return (
              <div
                className={`admin-availability-cell${closed ? ' is-closed' : ' is-open'}`}
                key={key}
                title={
                  closed
                    ? t.adminAvailabilityClosed
                    : `${t.adminAvailabilityOpen} · ${slots}`
                }
              >
                <span>{day}</span>
                <small>{closed ? t.adminAvailabilityClosed : slots}</small>
              </div>
            )
          })}
        </div>
      </fieldset>
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
  const [availabilityBusy, setAvailabilityBusy] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const now = new Date()
  const [availabilityYear, setAvailabilityYear] = useState(now.getFullYear())
  const [availabilityMonth, setAvailabilityMonth] = useState(now.getMonth())
  const [instagramUrls, setInstagramUrls] = useState<string[]>(emptyInstagramSlots)
  const [instagramBusy, setInstagramBusy] = useState(false)

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
        error?: string
      }>(`/api/admin/availability?from=${from}&to=${to}`)
      setAvailabilitySettings(data.settings)
      setAvailabilityDays(data.days ?? [])
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
    } finally {
      setAvailabilityBusy(false)
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

  const current = (item: StoredMenuItem) => drafts[item.id || 'new'] ?? item

  const saveItem = async (item: StoredMenuItem) => {
    const key = item.id || 'new'
    setBusyId(key)
    setMessage(null)
    try {
      const data = await api<{ item: StoredMenuItem }>('/api/admin/menu', {
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
      setMessage(t.adminSaved)
    } catch {
      setMessage(t.adminSaveError)
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
                  <>
                    {MENU_CATEGORY_IDS.map((categoryId) => {
                      const rows = items.filter(
                        (item) => item.category_id === categoryId,
                      )
                      return (
                        <section className="carta-section" key={categoryId}>
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
                              onChange={(next) =>
                                setDrafts((prev) => ({ ...prev, [item.id]: next }))
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

                    <section className="carta-section">
                      <h2>{t.adminNewDish}</h2>
                      <DishEditor
                        item={current(
                          emptyItem((items.at(-1)?.sort_order ?? 0) + 10),
                        )}
                        t={t}
                        busy={busyId === 'new'}
                        onChange={(next) =>
                          setDrafts((prev) => ({ ...prev, new: next }))
                        }
                        onSave={() =>
                          void saveItem(
                            current(
                              emptyItem((items.at(-1)?.sort_order ?? 0) + 10),
                            ),
                          )
                        }
                        onDelete={() => undefined}
                        onPhoto={(file) =>
                          void uploadPhoto(
                            current(
                              emptyItem((items.at(-1)?.sort_order ?? 0) + 10),
                            ),
                            file,
                          )
                        }
                      />
                    </section>
                  </>
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
