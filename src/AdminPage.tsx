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
type AdminTab = 'menu' | 'account' | 'restaurant'
type LoginView = 'sign-in' | 'forgot' | 'reset'

function adminHeading(t: Copy, tab: AdminTab): string {
  switch (tab) {
    case 'menu':
      return t.adminHeading
    case 'account':
      return t.adminAccountHeading
    case 'restaurant':
      return t.adminRestaurantHeading
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
    default: {
      const _exhaustive: never = tab
      return _exhaustive
    }
  }
}

function resetTokenFromLocation(): string {
  const token = new URLSearchParams(window.location.search).get('reset')
  return token?.trim() || ''
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

function AccountInfoEditor({
  accountUsername,
  currentPassword,
  newPassword,
  confirmPassword,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSave,
  busy,
  t,
}: {
  accountUsername: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
  onCurrentPasswordChange: (value: string) => void
  onNewPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onSave: () => void
  busy: boolean
  t: Copy
}) {
  return (
    <section className="admin-account takeout-form">
      <label className="takeout-field">
        <span>{t.adminUser}</span>
        <input value={accountUsername} readOnly />
      </label>

      <fieldset className="admin-company-block">
        <legend>{t.adminAccountChangePassword}</legend>
        <label className="takeout-field">
          <span>{t.adminAccountCurrentPassword}</span>
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            disabled={busy}
            onChange={(event) => onCurrentPasswordChange(event.target.value)}
          />
        </label>
        <label className="takeout-field">
          <span>{t.adminResetPassword}</span>
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            disabled={busy}
            onChange={(event) => onNewPasswordChange(event.target.value)}
          />
        </label>
        <label className="takeout-field">
          <span>{t.adminResetConfirm}</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            disabled={busy}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
          />
        </label>
      </fieldset>

      <button className="btn" type="button" disabled={busy} onClick={onSave}>
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
  const [accountCurrentPassword, setAccountCurrentPassword] = useState('')
  const [accountNewPassword, setAccountNewPassword] = useState('')
  const [accountConfirmPassword, setAccountConfirmPassword] = useState('')
  const [accountBusy, setAccountBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function boot() {
      try {
        await api('/api/admin/session')
        const [menuData, companyData, accountData] = await Promise.all([
          api<{ items: StoredMenuItem[] }>('/api/admin/menu'),
          api<{ info: StoredCompanyInfo }>('/api/admin/company'),
          api<{ username: string }>('/api/admin/account'),
        ])
        if (!cancelled) {
          setItems(menuData.items)
          setCompanyInfo(companyData.info)
          setAccountUsername(accountData.username)
          setStatus('ready')
        }
      } catch {
        if (!cancelled) {
          setStatus('login')
        }
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
    try {
      await api('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const [menuData, companyData, accountData] = await Promise.all([
        api<{ items: StoredMenuItem[] }>('/api/admin/menu'),
        api<{ info: StoredCompanyInfo }>('/api/admin/company'),
        api<{ username: string }>('/api/admin/account'),
      ])
      setItems(menuData.items)
      setCompanyInfo(companyData.info)
      setAccountUsername(accountData.username)
      setStatus('ready')
    } catch {
      setLoginError(t.adminLoginError)
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

  const saveAccountPassword = async () => {
    setAccountBusy(true)
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
      setAccountBusy(false)
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
              <h1>
                {status === 'ready'
                  ? adminHeading(t, tab)
                  : loginView === 'forgot'
                    ? t.adminForgotHeading
                    : loginView === 'reset'
                      ? t.adminResetHeading
                      : t.adminHeading}
              </h1>
              <p className="lead muted">
                {status === 'ready'
                  ? adminLead(t, tab)
                  : loginView === 'forgot'
                    ? t.adminForgotLead
                    : loginView === 'reset'
                      ? t.adminResetLead
                      : t.adminLead}
              </p>
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
                {tab === 'account' ? (
                  <AccountInfoEditor
                    accountUsername={accountUsername}
                    currentPassword={accountCurrentPassword}
                    newPassword={accountNewPassword}
                    confirmPassword={accountConfirmPassword}
                    onCurrentPasswordChange={setAccountCurrentPassword}
                    onNewPasswordChange={setAccountNewPassword}
                    onConfirmPasswordChange={setAccountConfirmPassword}
                    onSave={() => void saveAccountPassword()}
                    busy={accountBusy}
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
