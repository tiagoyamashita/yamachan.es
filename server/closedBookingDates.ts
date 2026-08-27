import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  adminSupabaseKey,
  adminSupabaseUrl,
  adminWriteSecret,
} from './adminEnv.ts'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isDateKey(value: string): boolean {
  return DATE_RE.test(value)
}

function getSupabase(): SupabaseClient | null {
  const url = adminSupabaseUrl()
  const key = adminSupabaseKey()
  if (!url || !key) {
    return null
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

export function parseClosedBookingDates(raw: string | undefined | null): string[] {
  if (!raw?.trim()) {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return [
      ...new Set(
        parsed.filter(
          (entry): entry is string => typeof entry === 'string' && isDateKey(entry),
        ),
      ),
    ].sort()
  } catch {
    return []
  }
}

export async function loadClosedBookingDates(): Promise<string[]> {
  const supabase = getSupabase()
  if (!supabase) {
    return []
  }
  const { data, error } = await supabase.rpc('yamachan_get_closed_booking_dates')
  if (error) {
    throw new Error(error.message)
  }
  return parseClosedBookingDates(typeof data === 'string' ? data : null)
}

export async function setClosedBookingDates(dates: string[]): Promise<string[]> {
  const secret = adminWriteSecret()
  const supabase = getSupabase()
  if (!secret || !supabase) {
    throw new Error('missing-admin-config')
  }
  const unique = [
    ...new Set(dates.filter((date) => isDateKey(date))),
  ].sort()
  const { data, error } = await supabase.rpc(
    'yamachan_admin_set_closed_booking_dates',
    {
      p_secret: secret,
      p_dates: JSON.stringify(unique),
    },
  )
  if (error) {
    throw new Error(error.message)
  }
  return parseClosedBookingDates(typeof data === 'string' ? data : null)
}

export async function setBookingDayOpen(
  date: string,
  open: boolean,
): Promise<string[]> {
  if (!isDateKey(date)) {
    throw new Error('invalid-date')
  }
  const current = await loadClosedBookingDates()
  const next = open
    ? current.filter((entry) => entry !== date)
    : [...new Set([...current, date])].sort()
  return setClosedBookingDates(next)
}
