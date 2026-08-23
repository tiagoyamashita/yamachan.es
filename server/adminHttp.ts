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

    if (path === '/api/admin/menu' && request.method === 'PUT') {
      const item = readItem(await request.json().catch(() => null))
      if (!item || !item.name_es) {
        return json({ error: 'invalid-item' }, 400)
      }
      return json({ item: await upsertAdminMenuItem(item) })
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
