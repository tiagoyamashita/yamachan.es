const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export class GloballyBookedError extends Error {
  status: number

  constructor(message: string, status = 502) {
    super(message)
    this.name = 'GloballyBookedError'
    this.status = status
  }
}

export type AvailabilitySlot = {
  start_datetime: string
  time_label: string
  available_table_count: number
}

export type DayAvailability = {
  date: string
  closed: boolean
  slot_count: number
}

export type CreatedReservation = {
  id: string
  start_datetime: string
  end_datetime: string | null
  party_size: number
  status: string
  client_name: string
  restaurant_tables?: { label?: string } | { label?: string }[] | null
}

type Envelope<T> = {
  ok?: boolean
  error?: string
  data?: T
  created?: string
}

function apiBase(): string {
  return (process.env.GLOBALLYBOOKED_API_BASE || 'https://www.globallybooked.com').replace(
    /\/+$/,
    '',
  )
}

function restaurantSlug(): string {
  return process.env.GLOBALLYBOOKED_RESTAURANT_SLUG || 'yama-chan-alicante'
}

function restaurantToken(): string {
  const token = process.env.GLOBALLYBOOKED_RESTAURANT_TOKEN?.trim()
  if (!token) {
    throw new GloballyBookedError('not-configured', 503)
  }
  return token
}

function restaurantPath(suffix: string): string {
  return `/api/user/restaurants/${encodeURIComponent(restaurantSlug())}${suffix}`
}

async function gbFetch<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${restaurantToken()}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = (await response.json().catch(() => ({}))) as Envelope<T>
  if (!response.ok || json.ok === false) {
    const status = response.status === 401 || response.status === 403 ? 502 : response.status
    throw new GloballyBookedError(json.error || `Request failed (${response.status})`, status)
  }
  if (json.data === undefined) {
    throw new GloballyBookedError('empty-response', 502)
  }
  return json.data
}

export function isDateKey(value: string): boolean {
  return DATE_RE.test(value)
}

export async function loadDaySlots(date: string, partySize: number) {
  const data = await gbFetch<{
    date: string
    timezone: string
    party_size: number
    day_closed: boolean
    slots: AvailabilitySlot[]
  }>(
    'GET',
    `${restaurantPath('/availability')}?date=${encodeURIComponent(date)}&party_size=${partySize}`,
  )
  return {
    date: data.date,
    timezone: data.timezone,
    partySize: data.party_size,
    dayClosed: data.day_closed,
    slots: data.slots ?? [],
  }
}

export async function loadMonthDays(from: string, to: string, partySize: number) {
  const data = await gbFetch<{
    timezone: string
    party_size: number
    from: string
    to: string
    days: DayAvailability[]
  }>(
    'GET',
    `${restaurantPath('/availability')}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&party_size=${partySize}`,
  )
  return {
    timezone: data.timezone,
    partySize: data.party_size,
    days: data.days ?? [],
  }
}

export async function createReservation(input: {
  partySize: number
  startDatetime: string
  clientName: string
  clientEmail: string
  clientPhone: string | null
  clientNotes: string | null
}): Promise<CreatedReservation> {
  return gbFetch<CreatedReservation>('POST', restaurantPath('/reservations'), {
    party_size: input.partySize,
    start_datetime: input.startDatetime,
    client_name: input.clientName,
    client_email: input.clientEmail,
    client_phone: input.clientPhone,
    client_notes: input.clientNotes,
  })
}

export function tableLabel(reservation: CreatedReservation): string | null {
  const table = reservation.restaurant_tables
  if (!table) {
    return null
  }
  const row = Array.isArray(table) ? table[0] : table
  return row?.label ?? null
}
