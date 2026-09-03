import {
  adminHasStoredPassword,
  setStoredAdminPassword,
} from './adminPassword.ts'
import {
  clearSessionCookie,
  credentialsAreValid,
  expectedAdminUsername,
  isSecureRequest,
  requestIsAuthed,
  sessionCookie,
  signSession,
  verifyAdminPassword,
} from './adminSession.ts'
import { setStoredAdminEmail, expectedAdminEmail } from './adminSettings.ts'
import {
  passwordResetEmailConfigured,
  sendPasswordResetEmail,
} from './adminMail.ts'
import {
  passwordResetTokenIsValid,
  signPasswordResetToken,
} from './adminResetToken.ts'
import {
  deleteAdminMenuItem,
  importInventoryFromGloballyBooked,
  listAdminMenu,
  upsertAdminMenuItem,
  uploadMenuPhoto,
} from './adminMenu.ts'
import {
  isMenuCategoryId,
  slugFromName,
  type StoredMenuItem,
} from '../src/menu.ts'
import {
  getAdminCompanyInfo,
  upsertAdminCompanyInfo,
} from './adminCompanyInfo.ts'
import {
  parseStoredCompanyInfo,
  type StoredCompanyInfo,
} from '../src/companyInfo.ts'
import { parseAllergens } from '../src/allergens.ts'
import {
  GloballyBookedError,
  applyOpenDates,
  clearOpenDates,
  createOpeningRule,
  deleteOpeningRule,
  isDateKey,
  loadAdminBookings,
  loadMonthDays,
  loadOpenDates,
  loadOpeningRules,
  loadRestaurantSettings,
  loadRestaurantTables,
  loadGloballyBookedMenu,
  loadRestaurantMenuCategories,
  createRestaurantMenuCategory,
  loadTableOrders,
  submitTableOrderForTable,
  deleteTableOrderItem,
  closeRestaurantTableTab,
  updateOpeningRule,
  updateRestaurantSettings,
  updateTableOrderItemStatus,
  updateTableOrderStatus,
  type TableOrderItemStatus,
  type TableOrderStatus,
} from './globallyBooked.ts'
import {
  loadClosedBookingDates,
  setBookingDayOpen,
} from './closedBookingDates.ts'
import {
  getStoredInstagramPostUrls,
  padInstagramSlots,
  setStoredInstagramPostUrls,
} from './adminInstagram.ts'
import {
  loadTakeoutCatalog,
  normalizeTakeoutCatalogInput,
  saveTakeoutCatalog,
} from './takeoutCatalog.ts'

function json(
  data: unknown,
  status = 200,
  extra?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extra,
    },
  })
}

function unauthorized(): Response {
  return json({ error: 'unauthorized' }, 401)
}

function readItem(value: unknown): StoredMenuItem | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const row = value as Record<string, unknown>
  const categoryId = row.category_id
  if (!isMenuCategoryId(categoryId)) {
    return null
  }
  const nameEs = typeof row.name_es === 'string' ? row.name_es.trim() : ''
  const slugSource =
    typeof row.slug === 'string' && row.slug.trim()
      ? row.slug
      : slugFromName(nameEs)
  return {
    id: typeof row.id === 'string' ? row.id : '',
    slug: slugSource,
    category_id: categoryId,
    name_es: nameEs,
    name_en: typeof row.name_en === 'string' ? row.name_en : '',
    name_ja: typeof row.name_ja === 'string' ? row.name_ja : '',
    blurb_es: typeof row.blurb_es === 'string' ? row.blurb_es : '',
    blurb_en: typeof row.blurb_en === 'string' ? row.blurb_en : '',
    image_url: typeof row.image_url === 'string' ? row.image_url : '',
    vegetarian: Boolean(row.vegetarian),
    sort_order:
      typeof row.sort_order === 'number' && Number.isFinite(row.sort_order)
        ? Math.floor(row.sort_order)
        : 0,
    published: row.published !== false,
    allergens: parseAllergens(row.allergens),
    price_cents: (() => {
      const cents = Number(row.price_cents)
      if (Number.isFinite(cents) && cents >= 0) {
        return Math.round(cents)
      }
      const euros = Number(row.price)
      if (Number.isFinite(euros) && euros >= 0) {
        return Math.round(euros * 100)
      }
      return 0
    })(),
  }
}

function readCompanyInfo(value: unknown): StoredCompanyInfo | null {
  const parsed = parseStoredCompanyInfo(value)
  if (!parsed) {
    return null
  }
  if (parsed.hours.length === 0) {
    return null
  }
  if (parsed.schedule.openWeekdays.length === 0) {
    return null
  }
  return parsed
}

function siteOrigin(request: Request): string {
  const configured = process.env.ADMIN_SITE_URL?.trim()
  if (configured) {
    try {
      const href = configured.includes('://')
        ? configured
        : `https://${configured}`
      return new URL(href).origin
    } catch {
      // fall through to request origin
    }
  }
  const url = new URL(request.url)
  return url.origin
}

function readPassword(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const password = value.trim()
  if (password.length < 8) {
    return null
  }
  return password
}

function readEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const email = value.trim()
  if (email.length < 5 || !email.includes('@')) {
    return null
  }
  return email
}

export async function handleAdminRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/+$/, '') || '/'
  const secure = isSecureRequest(request)

  if (path === '/api/admin/login' && request.method === 'POST') {
    const body: unknown = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return unauthorized()
    }
    const { username, password } = body as {
      username?: unknown
      password?: unknown
    }
    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !(await credentialsAreValid(username, password))
    ) {
      return unauthorized()
    }
    return json(
      { ok: true },
      200,
      { 'Set-Cookie': sessionCookie(signSession(), secure) },
    )
  }

  if (path === '/api/admin/logout' && request.method === 'POST') {
    return json(
      { ok: true },
      200,
      { 'Set-Cookie': clearSessionCookie(secure) },
    )
  }

  if (path === '/api/admin/session' && request.method === 'GET') {
    if (!requestIsAuthed(request)) {
      return unauthorized()
    }
    return json({ ok: true })
  }

  if (path === '/api/admin/forgot-password' && request.method === 'POST') {
    const body: unknown = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return json({ ok: true })
    }
    const username =
      typeof (body as { username?: unknown }).username === 'string'
        ? (body as { username: string }).username.trim()
        : ''
    const expected = await expectedAdminUsername()
    if (
      username &&
      expected &&
      username === expected &&
      (await passwordResetEmailConfigured())
    ) {
      const token = signPasswordResetToken()
      if (token) {
        const resetUrl = `${siteOrigin(request)}/admin?token=${encodeURIComponent(token)}`
        try {
          await sendPasswordResetEmail(resetUrl)
        } catch {
          return json({ error: 'mail-send-failed' }, 500)
        }
      }
    }
    return json({ ok: true })
  }

  if (path === '/api/admin/reset-password' && request.method === 'POST') {
    const body: unknown = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return json({ error: 'invalid-request' }, 400)
    }
    const row = body as {
      token?: unknown
      password?: unknown
      confirm?: unknown
    }
    const token = typeof row.token === 'string' ? row.token : ''
    const password = readPassword(row.password)
    const confirm = readPassword(row.confirm)
    if (!passwordResetTokenIsValid(token) || !password || password !== confirm) {
      return json({ error: 'invalid-reset' }, 400)
    }
    try {
      await setStoredAdminPassword(password)
    } catch {
      return json({ error: 'reset-failed' }, 500)
    }
    return json({ ok: true })
  }

  if (!requestIsAuthed(request)) {
    return unauthorized()
  }

  try {
    if (path === '/api/admin/menu' && request.method === 'GET') {
      return json({ items: await listAdminMenu() })
    }

    if (path === '/api/admin/menu/categories' && request.method === 'GET') {
      try {
        return json({ categories: await loadRestaurantMenuCategories() })
      } catch (error) {
        if (error instanceof GloballyBookedError) {
          return json({ error: error.message }, error.status)
        }
        throw error
      }
    }

    if (path === '/api/admin/menu/categories' && request.method === 'POST') {
      const body: unknown = await request.json().catch(() => null)
      const name =
        body && typeof body === 'object' && typeof (body as { name?: unknown }).name === 'string'
          ? (body as { name: string }).name.trim()
          : ''
      if (!name) {
        return json({ error: 'invalid-category' }, 400)
      }
      const rawSort =
        body && typeof body === 'object' ? (body as { sort_order?: unknown }).sort_order : undefined
      const sortOrder = Number(rawSort)
      try {
        return json({
          category: await createRestaurantMenuCategory({
            name,
            sort_order: Number.isFinite(sortOrder) ? Math.floor(sortOrder) : 0,
          }),
        })
      } catch (error) {
        if (error instanceof GloballyBookedError) {
          return json({ error: error.message }, error.status)
        }
        throw error
      }
    }

    if (path === '/api/admin/menu/import-inventory' && request.method === 'POST') {
      try {
        return json(await importInventoryFromGloballyBooked())
      } catch (error) {
        if (error instanceof GloballyBookedError) {
          return json({ error: error.message }, error.status)
        }
        throw error
      }
    }

    if (path === '/api/admin/menu' && request.method === 'PUT') {
      const item = readItem(await request.json().catch(() => null))
      if (!item || !item.name_es) {
        return json({ error: 'invalid-item' }, 400)
      }
      return json(await upsertAdminMenuItem(item))
    }

    if (path === '/api/admin/menu' && request.method === 'DELETE') {
      const id = url.searchParams.get('id')
      if (!id) {
        return json({ error: 'missing-id' }, 400)
      }
      await deleteAdminMenuItem(id)
      return json({ ok: true })
    }

    if (path === '/api/admin/photo' && request.method === 'POST') {
      const form = await request.formData()
      const file = form.get('file')
      if (!(file instanceof File)) {
        return json({ error: 'missing-file' }, 400)
      }
      return json(await uploadMenuPhoto(file))
    }

    if (path === '/api/admin/company' && request.method === 'GET') {
      return json({ info: await getAdminCompanyInfo() })
    }

    if (path === '/api/admin/company' && request.method === 'PUT') {
      const info = readCompanyInfo(await request.json().catch(() => null))
      if (!info) {
        return json({ error: 'invalid-company-info' }, 400)
      }
      return json({ info: await upsertAdminCompanyInfo(info) })
    }

    if (path === '/api/admin/bookings' && request.method === 'GET') {
      try {
        const from = url.searchParams.get('from') ?? ''
        const to = url.searchParams.get('to') ?? ''
        if (!isDateKey(from) || !isDateKey(to)) {
          return json({ error: 'invalid-range' }, 400)
        }
        return json(await loadAdminBookings(from, to))
      } catch (error) {
        if (error instanceof GloballyBookedError) {
          return json({ error: error.message }, error.status)
        }
        throw error
      }
    }

    if (path === '/api/admin/orders' && request.method === 'GET') {
      try {
        const includeClosed =
          url.searchParams.get('include_closed') === '1' ||
          url.searchParams.get('include_closed') === 'true'
        const settings = await loadRestaurantSettings()
        return json({
          orders: await loadTableOrders(includeClosed),
          timezone: settings.timezone || 'Europe/Madrid',
        })
      } catch (error) {
        if (error instanceof GloballyBookedError) {
          return json({ error: error.message }, error.status)
        }
        throw error
      }
    }

    {
      const orderMatch = /^\/api\/admin\/orders\/([^/]+)$/.exec(path)
      if (orderMatch && request.method === 'PATCH') {
        const orderId = decodeURIComponent(orderMatch[1] ?? '')
        const body: unknown = await request.json().catch(() => null)
        const status =
          body && typeof body === 'object' && typeof (body as { status?: unknown }).status === 'string'
            ? ((body as { status: string }).status as TableOrderStatus)
            : null
        if (!status) {
          return json({ error: 'invalid-status' }, 400)
        }
        try {
          return json({ order: await updateTableOrderStatus(orderId, status) })
        } catch (error) {
          if (error instanceof GloballyBookedError) {
            return json({ error: error.message }, error.status)
          }
          throw error
        }
      }
    }

    {
      const itemMatch = /^\/api\/admin\/orders\/([^/]+)\/items\/([^/]+)$/.exec(path)
      if (itemMatch && request.method === 'PATCH') {
        const orderId = decodeURIComponent(itemMatch[1] ?? '')
        const itemId = decodeURIComponent(itemMatch[2] ?? '')
        const body: unknown = await request.json().catch(() => null)
        const status =
          body && typeof body === 'object' && typeof (body as { status?: unknown }).status === 'string'
            ? ((body as { status: string }).status as TableOrderItemStatus)
            : null
        if (!status) {
          return json({ error: 'invalid-status' }, 400)
        }
        try {
          return json({
            item: await updateTableOrderItemStatus(orderId, itemId, status),
          })
        } catch (error) {
          if (error instanceof GloballyBookedError) {
            return json({ error: error.message }, error.status)
          }
          throw error
        }
      }
    }

    if (path === '/api/admin/tables' && request.method === 'GET') {
      try {
        const [tables, orders] = await Promise.all([
          loadRestaurantTables(),
          loadTableOrders(true),
        ])
        const settings = await loadRestaurantSettings()
        return json({
          tables,
          orders,
          timezone: settings.timezone || 'Europe/Madrid',
        })
      } catch (error) {
        if (error instanceof GloballyBookedError) {
          return json({ error: error.message }, error.status)
        }
        throw error
      }
    }

    if (path === '/api/admin/tables/menu' && request.method === 'GET') {
      try {
        return json({ items: await loadGloballyBookedMenu() })
      } catch (error) {
        if (error instanceof GloballyBookedError) {
          return json({ error: error.message }, error.status)
        }
        throw error
      }
    }

    {
      const tableOrderMatch = /^\/api\/admin\/tables\/([^/]+)\/orders$/.exec(path)
      if (tableOrderMatch && request.method === 'POST') {
        const tableId = decodeURIComponent(tableOrderMatch[1] ?? '')
        const body: unknown = await request.json().catch(() => null)
        const items =
          body &&
          typeof body === 'object' &&
          Array.isArray((body as { items?: unknown }).items)
            ? (body as { items: Array<{ menu_item_id?: unknown; quantity?: unknown; line_notes?: unknown }> }).items
            : null
        if (!items || items.length === 0) {
          return json({ error: 'invalid-items' }, 400)
        }
        try {
          const result = await submitTableOrderForTable(
            tableId,
            items.map((item) => ({
              menu_item_id:
                typeof item.menu_item_id === 'string' ? item.menu_item_id : '',
              quantity: Number(item.quantity),
              line_notes:
                typeof item.line_notes === 'string' ? item.line_notes : null,
            })),
          )
          return json(result)
        } catch (error) {
          if (error instanceof GloballyBookedError) {
            return json({ error: error.message }, error.status)
          }
          throw error
        }
      }
    }

    {
      const closeTabMatch = /^\/api\/admin\/tables\/([^/]+)\/close-tab$/.exec(path)
      if (closeTabMatch && request.method === 'POST') {
        const tableId = decodeURIComponent(closeTabMatch[1] ?? '')
        const body: unknown = await request.json().catch(() => null)
        const paymentMethod =
          body &&
          typeof body === 'object' &&
          typeof (body as { payment_method?: unknown }).payment_method === 'string'
            ? (body as { payment_method: string }).payment_method
            : 'cash'
        const notes =
          body &&
          typeof body === 'object' &&
          typeof (body as { notes?: unknown }).notes === 'string'
            ? (body as { notes: string }).notes
            : null
        try {
          await closeRestaurantTableTab(tableId, paymentMethod, notes)
          return json({ closed: true })
        } catch (error) {
          if (error instanceof GloballyBookedError) {
            return json({ error: error.message }, error.status)
          }
          throw error
        }
      }
    }

    {
      const deleteItemMatch =
        /^\/api\/admin\/tables\/([^/]+)\/orders\/([^/]+)\/items\/([^/]+)$/.exec(path)
      if (deleteItemMatch && request.method === 'DELETE') {
        const orderId = decodeURIComponent(deleteItemMatch[2] ?? '')
        const itemId = decodeURIComponent(deleteItemMatch[3] ?? '')
        try {
          await deleteTableOrderItem(orderId, itemId)
          return json({ deleted: true })
        } catch (error) {
          if (error instanceof GloballyBookedError) {
            return json({ error: error.message }, error.status)
          }
          throw error
        }
      }
    }

    if (path === '/api/admin/availability' && request.method === 'GET') {
      try {
        const settings = await loadRestaurantSettings()
        const from = url.searchParams.get('from') ?? ''
        const to = url.searchParams.get('to') ?? ''
        const [rules, openDates, closedDates] = await Promise.all([
          loadOpeningRules(),
          loadOpenDates(),
          loadClosedBookingDates().catch(() => [] as string[]),
        ])
        if (from && to) {
          if (!isDateKey(from) || !isDateKey(to)) {
            return json({ error: 'invalid-range' }, 400)
          }
          const month = await loadMonthDays(from, to, 2)
          const monthOpenDates = openDates.filter(
            (row) => row.open_date >= from && row.open_date <= to,
          )
          const monthClosedDates = closedDates.filter(
            (date) => date >= from && date <= to,
          )
          return json({
            settings,
            days: month.days,
            timezone: month.timezone,
            rules,
            openDates: monthOpenDates,
            closedDates: monthClosedDates,
            usesOpenDateCalendar: openDates.length > 0,
          })
        }
        return json({
          settings,
          rules,
          openDates,
          closedDates,
          usesOpenDateCalendar: openDates.length > 0,
        })
      } catch (error) {
        if (error instanceof GloballyBookedError) {
          return json({ error: error.message }, error.status)
        }
        throw error
      }
    }

    if (path === '/api/admin/booking-status' && request.method === 'PUT') {
      const body: unknown = await request.json().catch(() => null)
      if (!body || typeof body !== 'object') {
        return json({ error: 'invalid-request' }, 400)
      }
      const row = body as { date?: unknown; open?: unknown }
      const date = typeof row.date === 'string' ? row.date : ''
      if (!isDateKey(date) || typeof row.open !== 'boolean') {
        return json({ error: 'invalid-booking-status' }, 400)
      }
      try {
        const closedDates = await setBookingDayOpen(date, row.open)
        return json({ closedDates, date, open: row.open })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'error'
        if (message === 'missing-admin-config') {
          return json({ error: message }, 503)
        }
        if (message === 'invalid-date') {
          return json({ error: message }, 400)
        }
        return json({ error: message }, 500)
      }
    }

    if (path === '/api/admin/opening-rules' && request.method === 'POST') {
      const body: unknown = await request.json().catch(() => null)
      if (!body || typeof body !== 'object') {
        return json({ error: 'invalid-request' }, 400)
      }
      const row = body as {
        name?: unknown
        opensAt?: unknown
        closesAt?: unknown
        color?: unknown
      }
      try {
        const rule = await createOpeningRule({
          name: typeof row.name === 'string' ? row.name : '',
          opensAt: typeof row.opensAt === 'string' ? row.opensAt : '',
          closesAt: typeof row.closesAt === 'string' ? row.closesAt : '',
          color: typeof row.color === 'string' ? row.color : undefined,
        })
        return json({ rule })
      } catch (error) {
        if (error instanceof GloballyBookedError) {
          return json({ error: error.message }, error.status)
        }
        throw error
      }
    }

    if (path === '/api/admin/opening-rules' && request.method === 'PUT') {
      const body: unknown = await request.json().catch(() => null)
      if (!body || typeof body !== 'object') {
        return json({ error: 'invalid-request' }, 400)
      }
      const row = body as {
        id?: unknown
        name?: unknown
        opensAt?: unknown
        closesAt?: unknown
        color?: unknown
      }
      try {
        const rule = await updateOpeningRule({
          id: typeof row.id === 'string' ? row.id : '',
          name: typeof row.name === 'string' ? row.name : undefined,
          opensAt: typeof row.opensAt === 'string' ? row.opensAt : undefined,
          closesAt: typeof row.closesAt === 'string' ? row.closesAt : undefined,
          color: typeof row.color === 'string' ? row.color : undefined,
        })
        return json({ rule })
      } catch (error) {
        if (error instanceof GloballyBookedError) {
          return json({ error: error.message }, error.status)
        }
        throw error
      }
    }

    if (path === '/api/admin/opening-rules' && request.method === 'DELETE') {
      const body: unknown = await request.json().catch(() => null)
      const id =
        body && typeof body === 'object' && typeof (body as { id?: unknown }).id === 'string'
          ? (body as { id: string }).id
          : url.searchParams.get('id')
      if (!id) {
        return json({ error: 'invalid-rule-id' }, 400)
      }
      try {
        await deleteOpeningRule(id)
        return json({ deleted: true, id })
      } catch (error) {
        if (error instanceof GloballyBookedError) {
          return json({ error: error.message }, error.status)
        }
        throw error
      }
    }

    if (path === '/api/admin/open-dates' && request.method === 'POST') {
      const body: unknown = await request.json().catch(() => null)
      if (!body || typeof body !== 'object') {
        return json({ error: 'invalid-request' }, 400)
      }
      const row = body as { ruleId?: unknown; dates?: unknown }
      const dates = Array.isArray(row.dates)
        ? row.dates.filter((value): value is string => typeof value === 'string')
        : []
      try {
        const openDates = await applyOpenDates({
          ruleId: typeof row.ruleId === 'string' ? row.ruleId : '',
          dates,
        })
        return json({ openDates })
      } catch (error) {
        if (error instanceof GloballyBookedError) {
          return json({ error: error.message }, error.status)
        }
        throw error
      }
    }

    if (path === '/api/admin/open-dates' && request.method === 'DELETE') {
      const body: unknown = await request.json().catch(() => null)
      const fromBody =
        body && typeof body === 'object' && Array.isArray((body as { dates?: unknown }).dates)
          ? (body as { dates: unknown[] }).dates.filter(
              (value): value is string => typeof value === 'string',
            )
          : []
      const fromQuery = (url.searchParams.get('dates') || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
      const dates = fromBody.length > 0 ? fromBody : fromQuery
      try {
        await clearOpenDates(dates)
        return json({ deleted: true, dates })
      } catch (error) {
        if (error instanceof GloballyBookedError) {
          return json({ error: error.message }, error.status)
        }
        throw error
      }
    }

    if (path === '/api/admin/availability' && request.method === 'PUT') {
      const body: unknown = await request.json().catch(() => null)
      if (!body || typeof body !== 'object') {
        return json({ error: 'invalid-request' }, 400)
      }
      const row = body as {
        opensAt?: unknown
        closesAt?: unknown
        slotIntervalMinutes?: unknown
        defaultTurnMinutes?: unknown
        timezone?: unknown
      }
      try {
        const settings = await updateRestaurantSettings({
          opensAt: typeof row.opensAt === 'string' ? row.opensAt : undefined,
          closesAt: typeof row.closesAt === 'string' ? row.closesAt : undefined,
          slotIntervalMinutes:
            typeof row.slotIntervalMinutes === 'number'
              ? row.slotIntervalMinutes
              : undefined,
          defaultTurnMinutes:
            typeof row.defaultTurnMinutes === 'number'
              ? row.defaultTurnMinutes
              : undefined,
          timezone: typeof row.timezone === 'string' ? row.timezone : undefined,
        })
        return json({ settings })
      } catch (error) {
        if (error instanceof GloballyBookedError) {
          return json({ error: error.message }, error.status)
        }
        throw error
      }
    }

    if (path === '/api/admin/takeout' && request.method === 'GET') {
      try {
        return json({ catalog: await loadTakeoutCatalog() })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'error'
        return json({ error: message }, 500)
      }
    }

    if (path === '/api/admin/takeout' && request.method === 'PUT') {
      const body: unknown = await request.json().catch(() => null)
      if (!body || typeof body !== 'object') {
        return json({ error: 'invalid-request' }, 400)
      }
      try {
        const catalog = await saveTakeoutCatalog(
          normalizeTakeoutCatalogInput((body as { catalog?: unknown }).catalog),
        )
        return json({ catalog })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'error'
        if (message === 'missing-admin-config') {
          return json({ error: message }, 503)
        }
        return json({ error: message }, 500)
      }
    }

    if (path === '/api/admin/instagram' && request.method === 'GET') {
      const urls = padInstagramSlots(await getStoredInstagramPostUrls())
      return json({ urls })
    }

    if (path === '/api/admin/instagram' && request.method === 'PUT') {
      const body: unknown = await request.json().catch(() => null)
      if (!body || typeof body !== 'object') {
        return json({ error: 'invalid-request' }, 400)
      }
      const rawUrls = (body as { urls?: unknown }).urls
      if (!Array.isArray(rawUrls)) {
        return json({ error: 'invalid-urls' }, 400)
      }
      const inputs = rawUrls.map((entry) =>
        typeof entry === 'string' ? entry : '',
      )
      try {
        const saved = await setStoredInstagramPostUrls(inputs)
        return json({ urls: padInstagramSlots(saved) })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'error'
        if (message.startsWith('invalid-url-')) {
          return json({ error: message }, 400)
        }
        throw error
      }
    }

    if (path === '/api/admin/account' && request.method === 'GET') {
      return json({
        username: await expectedAdminUsername(),
        hasStoredPassword: await adminHasStoredPassword(),
        resetEmail: await expectedAdminEmail(),
      })
    }

    if (path === '/api/admin/account/email' && request.method === 'PUT') {
      const body: unknown = await request.json().catch(() => null)
      if (!body || typeof body !== 'object') {
        return json({ error: 'invalid-request' }, 400)
      }
      const email = readEmail((body as { email?: unknown }).email)
      if (!email) {
        return json({ error: 'invalid-email' }, 400)
      }
      await setStoredAdminEmail(email)
      return json({ resetEmail: email })
    }

    if (path === '/api/admin/account/password' && request.method === 'PUT') {
      const body: unknown = await request.json().catch(() => null)
      if (!body || typeof body !== 'object') {
        return json({ error: 'invalid-request' }, 400)
      }
      const row = body as {
        currentPassword?: unknown
        password?: unknown
        confirm?: unknown
      }
      const currentPassword =
        typeof row.currentPassword === 'string' ? row.currentPassword : ''
      const password = readPassword(row.password)
      const confirm = readPassword(row.confirm)
      if (!password || password !== confirm) {
        return json({ error: 'invalid-password' }, 400)
      }
      if (!(await verifyAdminPassword(currentPassword))) {
        return json({ error: 'wrong-password' }, 401)
      }
      await setStoredAdminPassword(password)
      return json({ ok: true })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'error'
    const status =
      message === 'unsupported-type' || message === 'too-large' ? 400 : 500
    return json({ error: message }, status)
  }

  return json({ error: 'not-found' }, 404)
}
