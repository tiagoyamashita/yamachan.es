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
import { type Copy, type Locale } from './i18n/index.ts'
import { LanguagePicker } from './LanguagePicker.tsx'

type AdminStatus = 'loading' | 'login' | 'ready'

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
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
  })
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error('request-failed')
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
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [items, setItems] = useState<StoredMenuItem[]>([])
  const [drafts, setDrafts] = useState<Record<string, StoredMenuItem>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function boot() {
      try {
        await api('/api/admin/session')
        const data = await api<{ items: StoredMenuItem[] }>('/api/admin/menu')
        if (!cancelled) {
          setItems(data.items)
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
    try {
      await api('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await api<{ items: StoredMenuItem[] }>('/api/admin/menu')
      setItems(data.items)
      setStatus('ready')
    } catch {
      setLoginError(t.adminLoginError)
    }
  }

  const logout = async () => {
    await api('/api/admin/logout', { method: 'POST' })
    setItems([])
    setDrafts({})
    setStatus('login')
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
              <h1>{t.adminHeading}</h1>
              <p className="lead muted">{t.adminLead}</p>
            </header>

            {status === 'loading' ? <p className="muted">{t.adminLoading}</p> : null}

            {status === 'login' ? (
              <form className="takeout-form admin-login" onSubmit={(event) => void login(event)}>
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
                {loginError ? <p className="takeout-error">{loginError}</p> : null}
                <button className="btn" type="submit">
                  {t.adminSignIn}
                </button>
              </form>
            ) : null}

            {status === 'ready' ? (
              <>
                {message ? <p className="admin-message">{message}</p> : null}
                {MENU_CATEGORY_IDS.map((categoryId) => {
                  const rows = items.filter((item) => item.category_id === categoryId)
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
                          onPhoto={(file) => void uploadPhoto(current(item), file)}
                        />
                      ))}
                    </section>
                  )
                })}

                <section className="carta-section">
                  <h2>{t.adminNewDish}</h2>
                  <DishEditor
                    item={current(emptyItem((items.at(-1)?.sort_order ?? 0) + 10))}
                    t={t}
                    busy={busyId === 'new'}
                    onChange={(next) =>
                      setDrafts((prev) => ({ ...prev, new: next }))
                    }
                    onSave={() =>
                      void saveItem(
                        current(emptyItem((items.at(-1)?.sort_order ?? 0) + 10)),
                      )
                    }
                    onDelete={() => undefined}
                    onPhoto={(file) =>
                      void uploadPhoto(
                        current(emptyItem((items.at(-1)?.sort_order ?? 0) + 10)),
                        file,
                      )
                    }
                  />
                </section>
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
