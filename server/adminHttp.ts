import {
  clearSessionCookie,
  credentialsAreValid,
  isSecureRequest,
  requestIsAuthed,
  sessionCookie,
  signSession,
} from './adminSession.ts'
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
  }
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
      !credentialsAreValid(username, password)
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'error'
    const status =
      message === 'unsupported-type' || message === 'too-large' ? 400 : 500
    return json({ error: message }, status)
  }

  return json({ error: 'not-found' }, 404)
}
