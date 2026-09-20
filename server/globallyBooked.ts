import { loadClosedBookingDates } from './closedBookingDates.ts'

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

async function gbWrite(
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const response = await fetch(`${apiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${restaurantToken()}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = (await response.json().catch(() => ({}))) as Envelope<
    Record<string, unknown>
  >
  if (!response.ok || json.ok === false) {
    const status = response.status === 401 || response.status === 403 ? 502 : response.status
    throw new GloballyBookedError(json.error || `Request failed (${response.status})`, status)
  }
  if (!json.data || typeof json.data !== 'object' || Array.isArray(json.data)) {
    return null
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

export type AdminRestaurantTable = {
  id: string
  label: string
  seat_count: number
  is_active: boolean
  kind: string
  sort_order: number
}

type RestaurantTable = AdminRestaurantTable

type RestaurantReservation = {
  id: string
  table_id: string
  start_datetime: string
  end_datetime?: string | null
  turn_minutes?: number
  status?: string
  party_size?: number
  client_name?: string
  client_email?: string | null
  client_phone?: string | null
  client_notes?: string | null
  restaurant_tables?: { label?: string } | { label?: string }[] | null
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
  const data = await gbFetch<Array<Record<string, unknown>>>(
    'GET',
    restaurantPath('/tables'),
  )
  return (Array.isArray(data) ? data : []).map((row) => ({
    id: String(row.id ?? ''),
    label: typeof row.label === 'string' ? row.label.trim() : '',
    seat_count: Number(row.seat_count) || 0,
    is_active: row.is_active !== false,
    kind: row.kind === 'counter' ? 'counter' : 'table',
    sort_order: Number(row.sort_order) || 0,
  }))
}

export async function loadRestaurantTables(): Promise<AdminRestaurantTable[]> {
  return loadTables()
}

function menuCategoryFromRow(row: Record<string, unknown>): string | null {
  const nested =
    row.restaurant_menu_categories ?? row.menu_category ?? row.category
  if (nested && typeof nested === 'object') {
    const obj = nested as Record<string, unknown>
    for (const key of ['name', 'label', 'id'] as const) {
      const value = obj[key]
      if (typeof value === 'string' && value.trim()) {
        return value.trim()
      }
    }
  }
  for (const key of ['category_name', 'category', 'section', 'group'] as const) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return null
}

function mapMenuRow(row: Record<string, unknown>): GloballyBookedMenuItem | null {
  const id = String(row.id ?? '')
  const name = typeof row.name === 'string' ? row.name.trim() : ''
  if (!id || !name) {
    return null
  }
  const price =
    row.price_cents === null || row.price_cents === undefined
      ? null
      : Number(row.price_cents)
  return {
    id,
    name,
    description:
      typeof row.description === 'string' ? row.description.trim() || null : null,
    price_cents: Number.isFinite(price) ? price : null,
    is_available: row.is_available !== false,
    sort_order: Number(row.sort_order) || 0,
    category: menuCategoryFromRow(row),
    image_url:
      typeof row.image_url === 'string' ? row.image_url.trim() || null : null,
  }
}

export async function loadGloballyBookedMenu(): Promise<GloballyBookedMenuItem[]> {
  const data = await gbFetch<Array<Record<string, unknown>>>(
    'GET',
    restaurantPath('/menu'),
  )
  return (Array.isArray(data) ? data : [])
    .map((row) => mapMenuRow(row))
    .filter((item): item is GloballyBookedMenuItem => item !== null)
}

export type GloballyBookedMenuCategory = {
  id: string
  name: string
  sort_order: number
}

type MenuCategoryRow = GloballyBookedMenuCategory

function mapCategoryRow(row: Record<string, unknown>): MenuCategoryRow | null {
  const id = String(row.id ?? '')
  const name = typeof row.name === 'string' ? row.name.trim() : ''
  if (!id || !name) {
    return null
  }
  return {
    id,
    name,
    sort_order: Number(row.sort_order) || 0,
  }
}

export type SiteMenuSyncInput = {
  name: string
  aliases: string[]
  description: string | null
  price_cents: number | null
  image_url: string | null
  is_available: boolean
  sort_order: number
  categoryHint: string
}

function normalizeMenuName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

const CATEGORY_NEEDLES: Record<string, string[]> = {
  starters: ['entrantes', 'starters'],
  sushi: ['sushi'],
  sashimi: ['sashimi'],
  mains: ['platosprincipales', 'platos', 'mains'],
  dessert: ['postres', 'desserts', 'dessert'],
  drinks: ['bebidas', 'drinks'],
}

async function loadMenuCategories(): Promise<MenuCategoryRow[]> {
  const data = await gbFetch<Array<Record<string, unknown>>>(
    'GET',
    restaurantPath('/menu-categories'),
  )
  return (Array.isArray(data) ? data : [])
    .map((row) => mapCategoryRow(row))
    .filter((row): row is MenuCategoryRow => row !== null)
}

export async function loadRestaurantMenuCategories(): Promise<
  GloballyBookedMenuCategory[]
> {
  return loadMenuCategories()
}

export async function createRestaurantMenuCategory(input: {
  name: string
  sort_order?: number
}): Promise<GloballyBookedMenuCategory> {
  const name = input.name.trim()
  if (!name) {
    throw new GloballyBookedError('invalid-category', 400)
  }
  const sortOrder = Number.isFinite(input.sort_order)
    ? Math.floor(Number(input.sort_order))
    : 0
  const data = await gbFetch<Record<string, unknown>>(
    'POST',
    restaurantPath('/menu-categories'),
    {
      name,
      sort_order: sortOrder,
    },
  )
  const mapped = mapCategoryRow(data)
  if (!mapped) {
    throw new GloballyBookedError('category-create-failed', 502)
  }
  return mapped
}

function resolveMenuCategoryId(
  categories: MenuCategoryRow[],
  hint: string,
): string | null {
  const needles = new Set<string>([
    normalizeMenuName(hint),
    ...(CATEGORY_NEEDLES[hint] ?? []),
  ])
  for (const category of categories) {
    if (needles.has(normalizeMenuName(category.name))) {
      return category.id
    }
  }
  return null
}

function menuNameKey(value: string): string {
  return normalizeMenuName(value.replace(/\([^)]*\)/g, ''))
}

function findMatchingMenuItem(
  items: GloballyBookedMenuItem[],
  aliases: string[],
): GloballyBookedMenuItem | null {
  const unique = [
    ...new Set(aliases.map((alias) => alias.trim()).filter(Boolean)),
  ]
  for (const alias of unique) {
    const needle = normalizeMenuName(alias)
    const exact = items.find((item) => normalizeMenuName(item.name) === needle)
    if (exact) {
      return exact
    }
  }
  for (const alias of unique) {
    const needle = menuNameKey(alias)
    if (!needle) {
      continue
    }
    const exactCore = items.find((item) => menuNameKey(item.name) === needle)
    if (exactCore) {
      return exactCore
    }
  }
  for (const alias of unique) {
    const needle = menuNameKey(alias)
    if (needle.length < 6) {
      continue
    }
    const fuzzy = items.find((item) => {
      const name = menuNameKey(item.name)
      return name.startsWith(needle) || needle.startsWith(name)
    })
    if (fuzzy) {
      return fuzzy
    }
  }
  return null
}

function menuWriteBody(
  input: SiteMenuSyncInput,
  categoryId: string | null,
): Record<string, unknown> {
  return {
    name: input.name,
    description: input.description,
    price_cents: input.price_cents,
    image_url: input.image_url,
    is_available: input.is_available,
    sort_order: input.sort_order,
    ...(categoryId ? { category_id: categoryId } : {}),
  }
}

export async function upsertRestaurantMenuItem(
  input: SiteMenuSyncInput,
): Promise<GloballyBookedMenuItem> {
  const [items, categories] = await Promise.all([
    loadGloballyBookedMenu(),
    loadMenuCategories(),
  ])
  const categoryId = resolveMenuCategoryId(categories, input.categoryHint)
  const existing = findMatchingMenuItem(items, [input.name, ...input.aliases])
  const body = menuWriteBody(input, categoryId)
  let row: Record<string, unknown> | null = null
  let wrote = false
  if (existing) {
    try {
      row = await gbWrite(
        'PATCH',
        `${restaurantPath('/menu')}/${encodeURIComponent(existing.id)}`,
        body,
      )
      wrote = true
    } catch (error) {
      if (!(error instanceof GloballyBookedError && error.status === 404)) {
        throw error
      }
    }
  }
  if (!wrote) {
    row = await gbWrite('POST', restaurantPath('/menu'), body)
  }
  const mapped = row ? mapMenuRow(row) : null
  if (mapped) {
    return mapped
  }
  const refreshed = await loadGloballyBookedMenu()
  const found = findMatchingMenuItem(refreshed, [input.name, ...input.aliases])
  if (!found) {
    throw new GloballyBookedError('menu-sync-failed', 502)
  }
  return found
}

export async function hideRestaurantMenuItem(input: {
  name: string
  aliases: string[]
}): Promise<void> {
  const items = await loadGloballyBookedMenu()
  const existing = findMatchingMenuItem(items, [input.name, ...input.aliases])
  if (!existing) {
    return
  }
  await gbWrite(
    'PATCH',
    `${restaurantPath('/menu')}/${encodeURIComponent(existing.id)}`,
    { is_available: false },
  )
}

export async function deleteRestaurantMenuItem(id: string): Promise<void> {
  await gbWrite('DELETE', `${restaurantPath('/menu')}/${encodeURIComponent(id)}`)
}

type GuestSessionClaim = {
  token?: string
  expires_at?: string
}

async function gbPublicFetch<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = (await response.json().catch(() => ({}))) as Envelope<T> & {
    data?: T
  }
  if (!response.ok || json.ok === false) {
    const status = response.status === 401 || response.status === 403 ? 502 : response.status
    throw new GloballyBookedError(json.error || `Request failed (${response.status})`, status)
  }
  if (json.data === undefined) {
    throw new GloballyBookedError('empty-response', 502)
  }
  return json.data
}

async function claimTableGuestSession(tableId: string): Promise<string> {
  if (!tableId.trim()) {
    throw new GloballyBookedError('invalid-table-id', 400)
  }
  const data = await gbPublicFetch<GuestSessionClaim>(
    'POST',
    `/api/public/tables/${encodeURIComponent(tableId)}/session`,
  )
  const token = typeof data.token === 'string' ? data.token.trim() : ''
  if (!token) {
    throw new GloballyBookedError('session-claim-failed', 502)
  }
  return token
}

function normalizeSubmitItems(items: TableOrderSubmitItem[]): TableOrderSubmitItem[] {
  const normalized: TableOrderSubmitItem[] = []
  for (const item of items) {
    const menuItemId = item.menu_item_id?.trim()
    const quantity = Math.floor(Number(item.quantity))
    if (!menuItemId || quantity < 1) {
      continue
    }
    normalized.push({
      menu_item_id: menuItemId,
      quantity,
      line_notes:
        typeof item.line_notes === 'string' ? item.line_notes.trim() || null : null,
    })
  }
  if (normalized.length === 0) {
    throw new GloballyBookedError('invalid-items', 400)
  }
  return normalized
}

export async function submitTableOrderForTable(
  tableId: string,
  items: TableOrderSubmitItem[],
): Promise<{ orderId: string }> {
  const token = await claimTableGuestSession(tableId)
  const payload = normalizeSubmitItems(items)
  const data = await gbPublicFetch<{ order_id?: string }>(
    'POST',
    `/api/public/tables/${encodeURIComponent(tableId)}/orders`,
    {
      token,
      items: payload.map((item) => ({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        line_notes: item.line_notes ?? undefined,
      })),
    },
  )
  const orderId = typeof data.order_id === 'string' ? data.order_id.trim() : ''
  if (!orderId) {
    throw new GloballyBookedError('order-submit-failed', 502)
  }
  return { orderId }
}

export async function deleteTableOrderItem(
  orderId: string,
  itemId: string,
): Promise<void> {
  if (!orderId.trim() || !itemId.trim()) {
    throw new GloballyBookedError('invalid-order-item', 400)
  }
  await gbFetch<{ id: string }>(
    'DELETE',
    `${restaurantPath('/orders')}/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}`,
  )
}

export async function closeRestaurantTableTab(
  tableId: string,
  paymentMethod: string,
  notes?: string | null,
): Promise<void> {
  if (!tableId.trim()) {
    throw new GloballyBookedError('invalid-table-id', 400)
  }
  const method = paymentMethod.trim()
  if (!method) {
    throw new GloballyBookedError('invalid-payment-method', 400)
  }
  await gbFetch('POST', `${restaurantPath('/tables')}/${encodeURIComponent(tableId)}/close-tab`, {
    payment_method: method,
    notes: notes?.trim() || null,
  })
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
  const [openDates, tables, reservations, closedDates] = await Promise.all([
    loadOpenDates(),
    loadTables(),
    loadReservationsBetween(dayStartIso, dayEndIso),
    loadClosedBookingDates().catch(() => [] as string[]),
  ])
  if (closedDates.includes(date)) {
    return {
      date,
      timezone: settings.timezone,
      partySize,
      dayClosed: true,
      slots: [] as AvailabilitySlot[],
    }
  }
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
  const [openDates, closedDates] = await Promise.all([
    loadOpenDates(),
    loadClosedBookingDates().catch(() => [] as string[]),
  ])
  const closedSet = new Set(closedDates)
  const interval = settings.slot_interval_minutes || 15
  const turn = settings.default_turn_minutes || 90

  const days: DayAvailability[] = eachDateKey(from, to).map((date) => {
    if (closedSet.has(date)) {
      return {
        date,
        closed: true,
        slot_count: 0,
      }
    }
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

export type AdminBooking = {
  id: string
  date: string
  startDatetime: string
  endDatetime: string | null
  timeLabel: string
  partySize: number
  status: string
  clientName: string
  clientPhone: string | null
  clientEmail: string | null
  tableLabel: string | null
  notes: string | null
}

export type AdminBookingDay = {
  date: string
  bookingCount: number
}

function dateKeyInTimeZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

function timeLabelInTimeZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

function reservationTableLabel(
  reservation: RestaurantReservation,
): string | null {
  const table = reservation.restaurant_tables
  if (!table) {
    return null
  }
  const row = Array.isArray(table) ? table[0] : table
  return row?.label ?? null
}

export async function loadAdminBookings(
  from: string,
  to: string,
): Promise<{
  timezone: string
  bookings: AdminBooking[]
  days: AdminBookingDay[]
}> {
  if (!isDateKey(from) || !isDateKey(to)) {
    throw new GloballyBookedError('invalid-range', 400)
  }
  const settings = await loadRestaurantSettings()
  const timeZone = settings.timezone || 'UTC'
  const fromIso = localDateTimeToUtcIso(from, 0, timeZone)
  const toIso = localDateTimeToUtcIso(to, MINUTES_PER_DAY, timeZone)
  const raw = await loadReservationsBetween(fromIso, toIso)

  const bookings = raw
    .map((reservation): AdminBooking => {
      const start = reservation.start_datetime
      return {
        id: reservation.id,
        date: dateKeyInTimeZone(start, timeZone),
        startDatetime: start,
        endDatetime: reservation.end_datetime ?? null,
        timeLabel: timeLabelInTimeZone(start, timeZone),
        partySize: reservation.party_size ?? 0,
        status: reservation.status ?? 'confirmed',
        clientName: reservation.client_name?.trim() || '—',
        clientPhone: reservation.client_phone?.trim() || null,
        clientEmail: reservation.client_email?.trim() || null,
        tableLabel: reservationTableLabel(reservation),
        notes: reservation.client_notes?.trim() || null,
      }
    })
    .sort((a, b) => a.startDatetime.localeCompare(b.startDatetime))

  const countByDate = new Map<string, number>()
  for (const booking of bookings) {
    if (booking.status === 'cancelled') {
      continue
    }
    countByDate.set(booking.date, (countByDate.get(booking.date) ?? 0) + 1)
  }

  const days = eachDateKey(from, to).map((date) => ({
    date,
    bookingCount: countByDate.get(date) ?? 0,
  }))

  return { timezone: timeZone, bookings, days }
}

export type TableOrderItemStatus = 'pending' | 'preparing' | 'served'

export type TableOrderStatus =
  | 'open'
  | 'submitted'
  | 'preparing'
  | 'served'
  | 'closed'
  | 'cancelled'

export type TableOrderItem = {
  id: string
  menu_item_id?: string | null
  item_name: string
  quantity: number
  unit_price_cents: number
  line_notes: string | null
  status: TableOrderItemStatus
  created_at?: string
}

export type TableOrder = {
  id: string
  tableId: string | null
  status: TableOrderStatus
  created_at: string
  submitted_at: string | null
  updated_at?: string | null
  tableLabel: string | null
  orderNumber: string
  items: TableOrderItem[]
}

export type GloballyBookedMenuItem = {
  id: string
  name: string
  description: string | null
  price_cents: number | null
  is_available: boolean
  sort_order: number
  category: string | null
  image_url: string | null
}

export type TableOrderSubmitItem = {
  menu_item_id: string
  quantity: number
  line_notes?: string | null
}

type RawTableOrder = {
  id: string
  table_id?: string | null
  status?: string
  created_at?: string
  submitted_at?: string | null
  updated_at?: string | null
  restaurant_tables?: { label?: string } | { label?: string }[] | null
  restaurant_table_order_items?: Array<{
    id: string
    menu_item_id?: string | null
    item_name?: string
    quantity?: number
    unit_price_cents?: number
    line_notes?: string | null
    status?: string
    created_at?: string
  }> | null
}

function orderNumberFromId(id: string): string {
  return id.replaceAll('-', '').slice(0, 8).toUpperCase()
}

function normalizeItemStatus(value: string | undefined): TableOrderItemStatus {
  switch (value) {
    case 'preparing':
      return 'preparing'
    case 'served':
      return 'served'
    default:
      return 'pending'
  }
}

function normalizeOrderStatus(value: string | undefined): TableOrderStatus {
  switch (value) {
    case 'open':
    case 'submitted':
    case 'preparing':
    case 'served':
    case 'closed':
    case 'cancelled':
      return value
    default:
      return 'open'
  }
}

function mapTableOrder(row: RawTableOrder): TableOrder {
  const table = row.restaurant_tables
  const tableRow = Array.isArray(table) ? table[0] : table
  return {
    id: row.id,
    tableId:
      row.table_id?.trim() ||
      (typeof tableRow === 'object' && tableRow && 'id' in tableRow
        ? String(tableRow.id ?? '').trim() || null
        : null),
    status: normalizeOrderStatus(row.status),
    created_at: row.created_at ?? new Date().toISOString(),
    submitted_at: row.submitted_at ?? null,
    updated_at: row.updated_at ?? null,
    tableLabel: tableRow?.label?.trim() || null,
    orderNumber: orderNumberFromId(row.id),
    items: (row.restaurant_table_order_items ?? []).map((item) => ({
      id: item.id,
      menu_item_id: item.menu_item_id ?? null,
      item_name: item.item_name?.trim() || '—',
      quantity: Number(item.quantity) || 0,
      unit_price_cents: Number(item.unit_price_cents) || 0,
      line_notes: item.line_notes?.trim() || null,
      status: normalizeItemStatus(item.status),
      created_at: item.created_at,
    })),
  }
}

export async function loadTableOrders(includeClosed = false): Promise<TableOrder[]> {
  const query = includeClosed ? '?include_closed=true' : ''
  const data = await gbFetch<RawTableOrder[]>(
    'GET',
    `${restaurantPath('/orders')}${query}`,
  )
  return (Array.isArray(data) ? data : []).map(mapTableOrder)
}

export async function updateTableOrderStatus(
  orderId: string,
  status: TableOrderStatus,
): Promise<TableOrder> {
  if (!orderId.trim()) {
    throw new GloballyBookedError('invalid-order-id', 400)
  }
  const data = await gbFetch<RawTableOrder>(
    'PATCH',
    restaurantPath(`/orders/${encodeURIComponent(orderId)}`),
    { status },
  )
  return mapTableOrder(data)
}

export async function updateTableOrderItemStatus(
  orderId: string,
  itemId: string,
  status: TableOrderItemStatus,
): Promise<TableOrderItem> {
  if (!orderId.trim() || !itemId.trim()) {
    throw new GloballyBookedError('invalid-order-item', 400)
  }
  const data = await gbFetch<{
    id: string
    menu_item_id?: string | null
    item_name?: string
    quantity?: number
    unit_price_cents?: number
    line_notes?: string | null
    status?: string
    created_at?: string
  }>('PATCH', restaurantPath(`/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}`), {
    status,
  })
  return {
    id: data.id,
    menu_item_id: data.menu_item_id ?? null,
    item_name: data.item_name?.trim() || '—',
    quantity: Number(data.quantity) || 0,
    unit_price_cents: Number(data.unit_price_cents) || 0,
    line_notes: data.line_notes?.trim() || null,
    status: normalizeItemStatus(data.status),
    created_at: data.created_at,
  }
}


