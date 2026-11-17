import { GloballyBookedError, loadTableGuestMenu, submitTableOrderForTable } from './globallyBooked.ts'

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

export async function handleTableOrderRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/+$/, '') || '/'
  const menuMatch = /^\/api\/mesa\/([^/]+)$/.exec(path)
  const orderMatch = /^\/api\/mesa\/([^/]+)\/orders$/.exec(path)

  try {
    if (menuMatch && request.method === 'GET') {
      const tableId = decodeURIComponent(menuMatch[1] ?? '')
      const menu = await loadTableGuestMenu(tableId)
      return json(menu)
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
