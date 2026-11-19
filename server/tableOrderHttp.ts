import { dishNamesMatch } from '../src/menu.ts'
import {
  GloballyBookedError,
  loadTableGuestMenu,
  submitTableOrderForTable,
  type GloballyBookedMenuItem,
} from './globallyBooked.ts'
import { listPublishedMenu } from './publishedMenu.ts'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function fail(error: unknown): Response {
  if (error instanceof GloballyBookedError) {
    return json({ error: error.message }, error.status)
  }
  const message = error instanceof Error ? error.message : 'error'
  return json({ error: message }, 502)
}

function publicImageUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) {
    return null
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  const origin = (process.env.PUBLIC_SITE_URL || 'https://yamachan.es').replace(/\/+$/, '')
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`
}

function platePhoto(
  item: GloballyBookedMenuItem,
  published: Awaited<ReturnType<typeof listPublishedMenu>>,
): string | null {
  const own = item.image_url?.trim() ?? ''
  if (/^https?:\/\//i.test(own)) {
    return own
  }
  const match = published.find((dish) =>
    [dish.name_es, dish.name_en, dish.name_ja, dish.slug].some((name) =>
      dishNamesMatch(item.name, name),
    ),
  )
  if (match?.image_url) {
    return publicImageUrl(match.image_url)
  }
  return own.startsWith('/') ? publicImageUrl(own) : null
}

export async function withPublishedMenuPhotos<T extends GloballyBookedMenuItem>(
  items: T[],
): Promise<T[]> {
  let published: Awaited<ReturnType<typeof listPublishedMenu>> = []
  try {
    published = await listPublishedMenu()
  } catch {
    published = []
  }
  return items.map((item) => ({
    ...item,
    image_url: platePhoto(item, published),
  }))
}

export async function handleTableOrderRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/+$/, '') || '/'
  const menuMatch = /^\/api\/mesa\/([^/]+)$/.exec(path)
  const orderMatch = /^\/api\/mesa\/([^/]+)\/orders$/.exec(path)

  try {
    if (menuMatch && request.method === 'GET') {
      const tableId = decodeURIComponent(menuMatch[1] ?? '')
      const menu = await loadTableGuestMenu(tableId)
      return json({
        ...menu,
        items: await withPublishedMenuPhotos(menu.items),
      })
    }

    if (orderMatch && request.method === 'POST') {
      const tableId = decodeURIComponent(orderMatch[1] ?? '')
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
      const result = await submitTableOrderForTable(
        tableId,
        items.map((item) => ({
          menu_item_id: typeof item.menu_item_id === 'string' ? item.menu_item_id : '',
          quantity: Number(item.quantity),
          line_notes: typeof item.line_notes === 'string' ? item.line_notes : null,
        })),
      )
      return json(result)
    }

    return json({ error: 'not-found' }, 404)
  } catch (error) {
    return fail(error)
  }
}
