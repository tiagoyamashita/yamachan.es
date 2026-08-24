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

export type RestaurantSettings = {
  id: string
  name: string
  slug: string
  timezone: string
  opens_at: string
  closes_at: string
  default_turn_minutes: number
  slot_interval_minutes: number
}

async function gbFetch<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
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

function normalizeTime(value: string): string | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim())
  if (!match) {
    return null
  }
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export async function loadRestaurantSettings(): Promise<RestaurantSettings> {
  const data = await gbFetch<RestaurantSettings>('GET', restaurantPath(''))
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    timezone: data.timezone,
    opens_at: normalizeTime(data.opens_at) ?? data.opens_at,
    closes_at: normalizeTime(data.closes_at) ?? data.closes_at,
    default_turn_minutes: data.default_turn_minutes,
    slot_interval_minutes: data.slot_interval_minutes,
  }
}

export async function updateRestaurantSettings(input: {
  opensAt?: string
  closesAt?: string
  slotIntervalMinutes?: number
  defaultTurnMinutes?: number
  timezone?: string
}): Promise<RestaurantSettings> {
  const body: Record<string, unknown> = {}
  if (input.opensAt !== undefined) {
    const opens = normalizeTime(input.opensAt)
    if (!opens) {
      throw new GloballyBookedError('invalid-opens-at', 400)
    }
    body.opens_at = opens
  }
  if (input.closesAt !== undefined) {
    const closes = normalizeTime(input.closesAt)
    if (!closes) {
      throw new GloballyBookedError('invalid-closes-at', 400)
    }
    body.closes_at = closes
  }
  if (input.slotIntervalMinutes !== undefined) {
    if (
      !Number.isInteger(input.slotIntervalMinutes) ||
      input.slotIntervalMinutes < 1
    ) {
      throw new GloballyBookedError('invalid-slot-interval', 400)
    }
    body.slot_interval_minutes = input.slotIntervalMinutes
  }
  if (input.defaultTurnMinutes !== undefined) {
    if (
      !Number.isInteger(input.defaultTurnMinutes) ||
      input.defaultTurnMinutes < 1
    ) {
      throw new GloballyBookedError('invalid-turn-minutes', 400)
    }
    body.default_turn_minutes = input.defaultTurnMinutes
  }
  if (input.timezone !== undefined) {
    const timezone = input.timezone.trim()
    if (!timezone) {
      throw new GloballyBookedError('invalid-timezone', 400)
    }
    body.timezone = timezone
  }
  if (Object.keys(body).length === 0) {
    throw new GloballyBookedError('no-fields', 400)
  }
  const data = await gbFetch<RestaurantSettings>('PATCH', restaurantPath(''), body)
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    timezone: data.timezone,
    opens_at: normalizeTime(data.opens_at) ?? data.opens_at,
    closes_at: normalizeTime(data.closes_at) ?? data.closes_at,
    default_turn_minutes: data.default_turn_minutes,
    slot_interval_minutes: data.slot_interval_minutes,
  }
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
