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

export type OpeningRule = {
  id: string
  name: string
  opens_at: string
  closes_at: string
  color: string
}

export type OpenDateRow = {
  id?: string
  open_date: string
  rule_id?: string
  opens_at: string
  closes_at: string
  restaurant_opening_rules?: { id?: string; name?: string; color?: string } | null
}

const OPENING_RULE_COLORS = [
  'emerald',
  'sky',
  'violet',
  'amber',
  'rose',
  'slate',
] as const

type RestaurantTable = {
  id: string
  seat_count: number
  is_active?: boolean
  sort_order?: number
}

type RestaurantReservation = {
  id: string
  table_id: string
  start_datetime: string
  end_datetime?: string | null
  turn_minutes?: number
  status?: string
  party_size?: number
}

const MINUTES_PER_DAY = 24 * 60

function parseTimeToMinutes(timeStr: string): number {
  const match = /^(\d{1,2}):(\d{2})/.exec(timeStr.trim())
  if (!match) {
    return Number.NaN
  }
  return Number(match[1]) * 60 + Number(match[2])
}

function formatMinutesAsTime(minutes: number): string {
  const wrapped =
    ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const hour = Math.floor(wrapped / 60)
  const minute = wrapped % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function serviceWindow(
  opensAt: string,
  closesAt: string,
): { opens: number; closeExclusive: number } | null {
  const opens = parseTimeToMinutes(opensAt)
  const closes = parseTimeToMinutes(closesAt)
  if (!Number.isFinite(opens) || !Number.isFinite(closes) || opens === closes) {
    return null
  }
  return {
    opens,
    closeExclusive: closes > opens ? closes : closes + MINUTES_PER_DAY,
  }
}

function usesOpenDateCalendar(openDates: OpenDateRow[]): boolean {
  return openDates.length > 0
}

function windowsForDate(
  settings: RestaurantSettings,
  date: string,
  openDates: OpenDateRow[],
): Array<{ opens: number; closeExclusive: number }> {
  const dayRows = openDates.filter((row) => row.open_date.slice(0, 10) === date)
  if (dayRows.length > 0) {
    return dayRows
      .map((row) => serviceWindow(row.opens_at, row.closes_at))
      .filter((window): window is { opens: number; closeExclusive: number } =>
        Boolean(window),
      )
  }
  if (usesOpenDateCalendar(openDates)) {
    return []
  }
  const window = serviceWindow(settings.opens_at, settings.closes_at)
  return window ? [window] : []
}

function eachDateKey(from: string, to: string): string[] {
  const keys: string[] = []
  const cursor = new Date(`${from}T12:00:00Z`)
  const end = new Date(`${to}T12:00:00Z`)
  while (cursor.getTime() <= end.getTime()) {
    keys.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return keys
}

function estimateSlotCount(
  windows: Array<{ opens: number; closeExclusive: number }>,
  interval: number,
  turn: number,
): number {
  let count = 0
  for (const window of windows) {
    for (let mins = window.opens; mins + turn <= window.closeExclusive; mins += interval) {
      count += 1
    }
  }
  return count
}

function localDateTimeToUtcIso(
  dateKey: string,
  minutesFromMidnight: number,
  timeZone: string,
): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const extraDays = Math.floor(minutesFromMidnight / MINUTES_PER_DAY)
  const minsInDay =
    ((minutesFromMidnight % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const hours = Math.floor(minsInDay / 60)
  const mins = minsInDay % 60
  const base = new Date(Date.UTC(year, month - 1, day + extraDays, hours, mins, 0))

  let utc = base.getTime()
  for (let pass = 0; pass < 3; pass += 1) {
    const got = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(utc))
    const gotValue = (type: Intl.DateTimeFormatPartTypes) =>
      Number(got.find((part) => part.type === type)?.value ?? '0')
    const wantMinutes = hours * 60 + mins
    const gotMinutes = gotValue('hour') * 60 + gotValue('minute')
    utc += (wantMinutes - gotMinutes) * 60_000
    const wantDay = Date.UTC(year, month - 1, day + extraDays)
    const gotDay = Date.UTC(gotValue('year'), gotValue('month') - 1, gotValue('day'))
    utc += wantDay - gotDay
  }
  return new Date(utc).toISOString()
}

export async function loadOpeningRules(): Promise<OpeningRule[]> {
  const data = await gbFetch<OpeningRule[]>('GET', restaurantPath('/opening-rules'))
  return (Array.isArray(data) ? data : []).map((rule) => ({
    id: rule.id,
    name: rule.name,
    opens_at: normalizeTime(rule.opens_at) ?? rule.opens_at,
    closes_at: normalizeTime(rule.closes_at) ?? rule.closes_at,
    color: rule.color || 'emerald',
  }))
}

export async function createOpeningRule(input: {
  name: string
  opensAt: string
  closesAt: string
  color?: string
}): Promise<OpeningRule> {
  const name = input.name.trim()
  if (!name) {
    throw new GloballyBookedError('invalid-rule-name', 400)
  }
  const opensAt = normalizeTime(input.opensAt)
  const closesAt = normalizeTime(input.closesAt)
  if (!opensAt || !closesAt) {
    throw new GloballyBookedError('invalid-rule-hours', 400)
  }
  if (opensAt === closesAt) {
    throw new GloballyBookedError('invalid-rule-hours', 400)
  }
  const color =
    input.color &&
    (OPENING_RULE_COLORS as readonly string[]).includes(input.color)
      ? input.color
      : 'emerald'
  const data = await gbFetch<OpeningRule>('POST', restaurantPath('/opening-rules'), {
    name,
    opens_at: opensAt,
    closes_at: closesAt,
    color,
  })
  return {
    id: data.id,
    name: data.name,
    opens_at: normalizeTime(data.opens_at) ?? data.opens_at,
    closes_at: normalizeTime(data.closes_at) ?? data.closes_at,
    color: data.color || color,
  }
}

export async function updateOpeningRule(input: {
  id: string
  name?: string
  opensAt?: string
  closesAt?: string
  color?: string
}): Promise<OpeningRule> {
  if (!input.id.trim()) {
    throw new GloballyBookedError('invalid-rule-id', 400)
  }
  const body: Record<string, unknown> = {}
  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) {
      throw new GloballyBookedError('invalid-rule-name', 400)
    }
    body.name = name
  }
  if (input.opensAt !== undefined) {
    const opensAt = normalizeTime(input.opensAt)
    if (!opensAt) {
      throw new GloballyBookedError('invalid-rule-hours', 400)
    }
    body.opens_at = opensAt
  }
  if (input.closesAt !== undefined) {
    const closesAt = normalizeTime(input.closesAt)
    if (!closesAt) {
      throw new GloballyBookedError('invalid-rule-hours', 400)
    }
    body.closes_at = closesAt
  }
  if (input.color !== undefined) {
    if (!(OPENING_RULE_COLORS as readonly string[]).includes(input.color)) {
      throw new GloballyBookedError('invalid-rule-color', 400)
    }
    body.color = input.color
  }
  if (Object.keys(body).length === 0) {
    throw new GloballyBookedError('no-fields', 400)
  }
  const data = await gbFetch<OpeningRule>(
    'PATCH',
    restaurantPath(`/opening-rules/${encodeURIComponent(input.id)}`),
    body,
  )
  return {
    id: data.id,
    name: data.name,
    opens_at: normalizeTime(data.opens_at) ?? data.opens_at,
    closes_at: normalizeTime(data.closes_at) ?? data.closes_at,
    color: data.color || 'emerald',
  }
}

export async function deleteOpeningRule(id: string): Promise<void> {
  if (!id.trim()) {
    throw new GloballyBookedError('invalid-rule-id', 400)
  }
  await gbFetch<{ id: string }>('DELETE', restaurantPath(`/opening-rules/${encodeURIComponent(id)}`))
}

export async function loadOpenDates(): Promise<OpenDateRow[]> {
  const data = await gbFetch<OpenDateRow[]>('GET', restaurantPath('/open-dates'))
  return (Array.isArray(data) ? data : []).map((row) => ({
    id: row.id,
    open_date: row.open_date.slice(0, 10),
    rule_id: row.rule_id,
    opens_at: normalizeTime(row.opens_at) ?? row.opens_at,
    closes_at: normalizeTime(row.closes_at) ?? row.closes_at,
    restaurant_opening_rules: row.restaurant_opening_rules ?? null,
  }))
}

export async function applyOpenDates(input: {
  ruleId: string
  dates: string[]
}): Promise<OpenDateRow[]> {
  if (!input.ruleId.trim()) {
    throw new GloballyBookedError('invalid-rule-id', 400)
  }
  const dates = [...new Set(input.dates.filter(isDateKey))]
  if (dates.length === 0) {
    throw new GloballyBookedError('invalid-dates', 400)
  }
  const data = await gbFetch<OpenDateRow[]>('POST', restaurantPath('/open-dates'), {
    rule_id: input.ruleId,
    dates,
  })
  return Array.isArray(data) ? data : []
}

export async function clearOpenDates(dates: string[]): Promise<void> {
  const unique = [...new Set(dates.filter(isDateKey))]
  if (unique.length === 0) {
    throw new GloballyBookedError('invalid-dates', 400)
  }
  await gbFetch<{ dates: string[] }>(
    'DELETE',
    `${restaurantPath('/open-dates')}?dates=${encodeURIComponent(unique.join(','))}`,
  )
}

async function loadTables(): Promise<RestaurantTable[]> {
  const data = await gbFetch<RestaurantTable[]>('GET', restaurantPath('/tables'))
  return Array.isArray(data) ? data : []
}

async function loadReservationsBetween(
  fromIso: string,
  toIso: string,
): Promise<RestaurantReservation[]> {
  const data = await gbFetch<RestaurantReservation[]>(
    'GET',
    `${restaurantPath('/reservations')}?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
  )
  return Array.isArray(data) ? data : []
}

function reservationEndIso(
  reservation: RestaurantReservation,
  defaultTurnMinutes: number,
): string {
  if (reservation.end_datetime) {
    return reservation.end_datetime
  }
  const turn = reservation.turn_minutes ?? defaultTurnMinutes
  return new Date(
    new Date(reservation.start_datetime).getTime() + turn * 60_000,
  ).toISOString()
}

function isTableFreeAt(
  startIso: string,
  turnMinutes: number,
  reservations: RestaurantReservation[],
  defaultTurnMinutes: number,
): boolean {
  const start = new Date(startIso).getTime()
  const end = start + turnMinutes * 60_000
  for (const reservation of reservations) {
    if (reservation.status === 'cancelled') {
      continue
    }
    const existingStart = new Date(reservation.start_datetime).getTime()
    const existingEnd = new Date(
      reservationEndIso(reservation, defaultTurnMinutes),
    ).getTime()
    if (start < existingEnd && end > existingStart) {
      return false
    }
  }
  return true
}

export async function loadDaySlots(date: string, partySize: number) {
  const settings = await loadRestaurantSettings()
  const timeZone = settings.timezone || 'UTC'
  const dayStartIso = localDateTimeToUtcIso(date, 0, timeZone)
  const dayEndIso = localDateTimeToUtcIso(date, MINUTES_PER_DAY, timeZone)
  const [openDates, tables, reservations] = await Promise.all([
    loadOpenDates(),
    loadTables(),
    loadReservationsBetween(dayStartIso, dayEndIso),
  ])
  const windows = windowsForDate(settings, date, openDates)
  const interval = settings.slot_interval_minutes || 15
  const turn = settings.default_turn_minutes || 90
  const fittingTables = tables.filter(
    (table) => table.is_active !== false && table.seat_count >= partySize,
  )
  const byTable = new Map<string, RestaurantReservation[]>()
  for (const reservation of reservations) {
    const list = byTable.get(reservation.table_id) ?? []
    list.push(reservation)
    byTable.set(reservation.table_id, list)
  }

  const slots: AvailabilitySlot[] = []
  const now = Date.now()
  for (const window of windows) {
    for (let mins = window.opens; mins + turn <= window.closeExclusive; mins += interval) {
      const startIso = localDateTimeToUtcIso(date, mins, settings.timezone || 'UTC')
      if (new Date(startIso).getTime() <= now) {
        continue
      }
      const available = fittingTables.filter((table) =>
        isTableFreeAt(startIso, turn, byTable.get(table.id) ?? [], turn),
      )
      if (available.length === 0) {
        continue
      }
      slots.push({
        start_datetime: startIso,
        time_label: formatMinutesAsTime(mins),
        available_table_count: available.length,
      })
    }
  }

  return {
    date,
    timezone: settings.timezone,
    partySize,
    dayClosed: windows.length === 0,
    slots,
  }
}

export async function loadMonthDays(from: string, to: string, partySize: number) {
  const settings = await loadRestaurantSettings()
  const openDates = await loadOpenDates()
  const interval = settings.slot_interval_minutes || 15
  const turn = settings.default_turn_minutes || 90

  const days: DayAvailability[] = eachDateKey(from, to).map((date) => {
    const windows = windowsForDate(settings, date, openDates)
    return {
      date,
      closed: windows.length === 0,
      slot_count: estimateSlotCount(windows, interval, turn),
    }
  })

  return {
    timezone: settings.timezone,
    partySize,
    days,
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
  const settings = await loadRestaurantSettings()
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: settings.timezone || 'UTC',
  }).format(new Date(input.startDatetime))
  const day = await loadDaySlots(date, input.partySize)
  const match = day.slots.find((slot) => slot.start_datetime === input.startDatetime)
  if (!match || match.available_table_count < 1) {
    throw new GloballyBookedError('no-tables-available', 409)
  }

  const tables = await loadTables()
  const reservations = await loadReservationsBetween(
    input.startDatetime,
    new Date(
      new Date(input.startDatetime).getTime() +
        (settings.default_turn_minutes || 90) * 60_000,
    ).toISOString(),
  )
  const turn = settings.default_turn_minutes || 90
  const byTable = new Map<string, RestaurantReservation[]>()
  for (const reservation of reservations) {
    const list = byTable.get(reservation.table_id) ?? []
    list.push(reservation)
    byTable.set(reservation.table_id, list)
  }
  const pick = tables
    .filter(
      (table) =>
        table.is_active !== false &&
        table.seat_count >= input.partySize &&
        isTableFreeAt(input.startDatetime, turn, byTable.get(table.id) ?? [], turn),
    )
    .sort((a, b) => {
      const order = (a.sort_order ?? 0) - (b.sort_order ?? 0)
      if (order !== 0) {
        return order
      }
      return a.seat_count - b.seat_count
    })[0]
  if (!pick) {
    throw new GloballyBookedError('no-tables-available', 409)
  }

  return gbFetch<CreatedReservation>('POST', restaurantPath('/reservations'), {
    table_id: pick.id,
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

