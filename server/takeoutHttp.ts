import {
  constructTakeoutWebhookEvent,
  createTakeoutCheckoutSession,
  loadPaidTakeoutSession,
  parseCheckoutBody,
  publicOrigin,
  TakeoutCheckoutError,
} from './takeoutCheckout.ts'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function fail(error: unknown): Response {
  if (error instanceof TakeoutCheckoutError) {
    return json({ error: error.message }, error.status)
  }
  const message = error instanceof Error ? error.message : 'error'
  return json({ error: message }, 502)
}

export async function handleTakeoutRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/+$/, '') || '/'

  try {
    if (path === '/api/takeout/checkout' && request.method === 'POST') {
      const body: unknown = await request.json().catch(() => null)
      const parsed = parseCheckoutBody(body)
      if (!parsed) {
        return json({ error: 'invalid-body' }, 400)
      }
      return json(
        await createTakeoutCheckoutSession({
          ...parsed,
          origin: publicOrigin(request),
        }),
      )
    }

    if (path === '/api/takeout/session' && request.method === 'GET') {
      const sessionId = url.searchParams.get('session_id')?.trim() ?? ''
      if (!sessionId) {
        return json({ error: 'invalid-session' }, 400)
      }
      return json(await loadPaidTakeoutSession(sessionId))
    }

    if (path === '/api/takeout/webhook' && request.method === 'POST') {
      const signature = request.headers.get('stripe-signature') ?? ''
      const payload = await request.text()
      constructTakeoutWebhookEvent(payload, signature)
      return json({ received: true })
    }
  } catch (error) {
    return fail(error)
  }

  return json({ error: 'not-found' }, 404)
}
