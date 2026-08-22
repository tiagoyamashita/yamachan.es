import {
  fallbackCompanyInfo,
  type OpeningSchedule,
} from './companyInfo.ts'
import { localeMeta, type Locale } from './i18n/locales.ts'

export const RESTAURANT_TIME_ZONE = 'Europe/Madrid'

const SLOT_MINUTES = 15
const LEAD_MINUTES = 30

function defaultSchedule(): OpeningSchedule {
  return fallbackCompanyInfo().schedule
}

function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}
const WEEKDAY_SHORT: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

export function todayKey(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: RESTAURANT_TIME_ZONE,
  }).format(now)
}

export function dateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

export function weekdayInRestaurantTz(key: string): number {
  const short = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: RESTAURANT_TIME_ZONE,
  }).format(new Date(`${key}T12:00:00Z`))
  return WEEKDAY_SHORT[short] ?? -1
}

export function isOpenDate(
  key: string,
  schedule: OpeningSchedule = defaultSchedule(),
): boolean {
  const weekday = weekdayInRestaurantTz(key)
  return schedule.openWeekdays.includes(weekday)
}

function madridParts(ms: number): {
  hour: number
  minute: number
  year: number
  month: number
  day: number
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: RESTAURANT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms))
  const value = (type: Intl.DateTimeFormatPartTypes) => {
    const part = parts.find((entry) => entry.type === type)
    return Number(part?.value ?? '0')
  }
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
  }
}

function localMadridToUtc(key: string, time: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  let utc = Date.UTC(year, month - 1, day, hour, minute)
  for (let pass = 0; pass < 2; pass += 1) {
    const got = madridParts(utc)
    utc += (hour * 60 + minute - (got.hour * 60 + got.minute)) * 60_000
    const gotDay = Date.UTC(got.year, got.month - 1, got.day)
    const wantDay = Date.UTC(year, month - 1, day)
    utc += wantDay - gotDay
  }
  return new Date(utc)
}

function formatHm(totalMinutes: number): string {
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function pickupSlotsForDate(
  key: string,
  now = new Date(),
  schedule: OpeningSchedule = defaultSchedule(),
): string[] {
  if (!isOpenDate(key, schedule) || key < todayKey(now)) {
    return []
  }
  const openMinutes = timeToMinutes(schedule.lunchOpen)
  const closeMinutes = timeToMinutes(schedule.lunchClose)
  const earliest = new Date(now.getTime() + LEAD_MINUTES * 60_000)
  const slots: string[] = []
  for (
    let minutes = openMinutes;
    minutes <= closeMinutes;
    minutes += SLOT_MINUTES
  ) {
    const time = formatHm(minutes)
    if (localMadridToUtc(key, time) >= earliest) {
      slots.push(time)
    }
  }
  return slots
}

export function hasPickupSlots(
  key: string,
  now = new Date(),
  schedule: OpeningSchedule = defaultSchedule(),
): boolean {
  return pickupSlotsForDate(key, now, schedule).length > 0
}

export function formatPickupLabel(
  locale: Locale,
  key: string,
  time: string,
): string {
  const date = new Intl.DateTimeFormat(localeMeta[locale].htmlLang, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: RESTAURANT_TIME_ZONE,
  }).format(new Date(`${key}T12:00:00Z`))
  return `${date}, ${time}`
}

export function monthTitle(locale: Locale, year: number, month: number): string {
  return new Intl.DateTimeFormat(localeMeta[locale].htmlLang, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month, 1))
}

export function weekdayLabels(locale: Locale): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(2024, 0, 1 + index))
    return new Intl.DateTimeFormat(localeMeta[locale].htmlLang, {
      weekday: 'short',
      timeZone: 'UTC',
    }).format(date)
  })
}

export function calendarCells(
  year: number,
  month: number,
): Array<{ day: number | null; key: string | null }> {
  const startWeekday = (weekdayInRestaurantTz(dateKey(year, month, 1)) + 6) % 7
  const last = new Date(year, month + 1, 0).getDate()
  const cells: Array<{ day: number | null; key: string | null }> = []
  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({ day: null, key: null })
  }
  for (let day = 1; day <= last; day += 1) {
    cells.push({ day, key: dateKey(year, month, day) })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, key: null })
  }
  return cells
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const next = new Date(year, month + delta, 1)
  return { year: next.getFullYear(), month: next.getMonth() }
}

export function monthFromKey(key: string): { year: number; month: number } {
  const [year, month] = key.split('-').map(Number)
  return { year, month: month - 1 }
}
