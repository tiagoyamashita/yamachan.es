import {
  GloballyBookedError,
  createReservation,
  isDateKey,
  loadDaySlots,
  loadMonthDays,
  tableLabel,
} from './globallyBooked.ts'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function parsePartySize(value: string | null): number | null {
  if (value === null || value === '') {
    return 2
  }
  const partySize = Number(value)
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 20) {
    return null
  }
  return partySize
}

function fail(error: unknown): Response {
  if (error instanceof GloballyBookedError) {
    return json({ error: error.message }, error.status)
  }
  const message = error instanceof Error ? error.message : 'error'
  return json({ error: message }, 502)
}

export async function handleReservationsRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/+$/, '') || '/'

  try {
    if (path === '/api/reservations/availability' && request.method === 'GET') {
      const date = url.searchParams.get('date') ?? ''
      const partySize = parsePartySize(url.searchParams.get('party_size'))
      if (!isDateKey(date) || partySize === null) {
        return json({ error: 'invalid-query' }, 400)
      }
      return json(await loadDaySlots(date, partySize))
    }

    if (path === '/api/reservations/days' && request.method === 'GET') {
      const from = url.searchParams.get('from') ?? ''
      const to = url.searchParams.get('to') ?? ''
      const partySize = parsePartySize(url.searchParams.get('party_size'))
      if (!isDateKey(from) || !isDateKey(to) || partySize === null) {
        return json({ error: 'invalid-query' }, 400)
      }
      return json(await loadMonthDays(from, to, partySize))
    }

    if (path === '/api/reservations' && request.method === 'POST') {
      const body: unknown = await request.json().catch(() => null)
      if (!body || typeof body !== 'object') {
        return json({ error: 'invalid-body' }, 400)
      }
      const row = body as Record<string, unknown>
      const partySize = Number(row.party_size)
      const startDatetime =
        typeof row.start_datetime === 'string' ? row.start_datetime.trim() : ''
      const clientName = typeof row.client_name === 'string' ? row.client_name.trim() : ''
      const clientEmail = typeof row.client_email === 'string' ? row.client_email.trim() : ''
      const clientPhone =
        typeof row.client_phone === 'string' ? row.client_phone.trim() : ''
      const clientNotes =
        typeof row.client_notes === 'string' ? row.client_notes.trim() : ''
      if (!Number.isInteger(partySize) || partySize < 1 || partySize > 20) {
        return json({ error: 'invalid-party-size' }, 400)
      }
      if (!startDatetime || Number.isNaN(new Date(startDatetime).getTime())) {
        return json({ error: 'invalid-time' }, 400)
      }
      if (!clientName || !clientEmail) {
        return json({ error: 'need-details' }, 400)
      }

      const reservation = await createReservation({
        partySize,
        startDatetime,
        clientName,
        clientEmail,
        clientPhone: clientPhone || null,
        clientNotes: clientNotes || null,
      })
      return json({
        booking: {
          id: reservation.id,
          startDatetime: reservation.start_datetime,
          endDatetime: reservation.end_datetime,
          partySize: reservation.party_size,
          status: reservation.status,
          name: reservation.client_name,
          tableLabel: tableLabel(reservation),
        },
      })
    }
  } catch (error) {
    return fail(error)
  }

  return json({ error: 'not-found' }, 404)
}
