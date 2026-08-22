import { restaurant } from './content.ts'
import type { Copy } from './i18n/types.ts'

export type HoursRow = {
  days: string
  time: string
}

export type OpeningSchedule = {
  openWeekdays: number[]
  lunchOpen: string
  lunchClose: string
}

export type StoredCompanyInfo = {
  phone: string
  phoneDisplay: string
  addressLines: string[]
  neighborhood: string
  hoursNote: string
  hours: HoursRow[]
  schedule: OpeningSchedule
}

export const WEEKDAY_LABELS_ES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const

export function fallbackCompanyInfo(): StoredCompanyInfo {
  return {
    phone: restaurant.phone,
    phoneDisplay: restaurant.phoneDisplay,
    addressLines: ['C/ Pardo Gimeno, 10', 'Local izquierda', '03007 Alicante'],
    neighborhood: 'Barrio de Benalúa, junto a Plaza de Navarro Rodrigo.',
    hoursNote:
      'El horario puede cambiar. Confírmalo en Instagram o al reservar.',
    hours: [
      { days: 'Miércoles – sábado', time: '13:00 – 16:30' },
      { days: 'Domingo – martes', time: 'Cerrado' },
    ],
    schedule: {
      openWeekdays: [3, 4, 5, 6],
      lunchOpen: '13:00',
      lunchClose: '16:30',
    },
  }
}

function parseHoursRow(value: unknown): HoursRow | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const row = value as Record<string, unknown>
  const days = typeof row.days === 'string' ? row.days.trim() : ''
  const time = typeof row.time === 'string' ? row.time.trim() : ''
  if (!days || !time) {
    return null
  }
  return { days, time }
}

function parseWeekday(value: unknown): number | null {
  const weekday = Number(value)
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return null
  }
  return weekday
}

function parseTime(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
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

function parseAddressLines(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null
  }
  const lines = value.flatMap((line) =>
    typeof line === 'string' && line.trim() ? [line.trim()] : [],
  )
  return lines.length > 0 ? lines : null
}

function parseOpenWeekdays(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((entry) => {
    const weekday = parseWeekday(entry)
    return weekday === null ? [] : [weekday]
  })
}

export function parseStoredCompanyInfo(value: unknown): StoredCompanyInfo | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const row = value as Record<string, unknown>
  const read = (snake: string, camel: string): unknown => row[snake] ?? row[camel]
  const phone = typeof read('phone', 'phone') === 'string' ? String(read('phone', 'phone')).trim() : ''
  const phoneDisplay =
    typeof read('phone_display', 'phoneDisplay') === 'string'
      ? String(read('phone_display', 'phoneDisplay')).trim()
      : ''
  const addressLines = parseAddressLines(read('address_lines', 'addressLines'))
  const neighborhood =
    typeof read('neighborhood', 'neighborhood') === 'string'
      ? String(read('neighborhood', 'neighborhood')).trim()
      : ''
  const hoursNote =
    typeof read('hours_note', 'hoursNote') === 'string'
      ? String(read('hours_note', 'hoursNote')).trim()
      : ''
  const hoursValue = read('hours', 'hours')
  const hours = Array.isArray(hoursValue)
    ? hoursValue.flatMap((entry: unknown) => {
        const parsed = parseHoursRow(entry)
        return parsed ? [parsed] : []
      })
    : []
  const scheduleRow =
    read('schedule', 'schedule') &&
    typeof read('schedule', 'schedule') === 'object'
      ? (read('schedule', 'schedule') as Record<string, unknown>)
      : null
  const openWeekdays = parseOpenWeekdays(read('open_weekdays', 'openWeekdays'))
  const scheduleWeekdays =
    parseOpenWeekdays(scheduleRow?.openWeekdays) ||
    parseOpenWeekdays(scheduleRow?.open_weekdays)
  const resolvedWeekdays =
    openWeekdays.length > 0 ? openWeekdays : scheduleWeekdays
  const lunchOpen =
    parseTime(read('lunch_open', 'lunchOpen')) ??
    parseTime(scheduleRow?.lunchOpen) ??
    parseTime(scheduleRow?.lunch_open) ??
    fallbackCompanyInfo().schedule.lunchOpen
  const lunchClose =
    parseTime(read('lunch_close', 'lunchClose')) ??
    parseTime(scheduleRow?.lunchClose) ??
    parseTime(scheduleRow?.lunch_close) ??
    fallbackCompanyInfo().schedule.lunchClose

  if (!phone || !phoneDisplay || !addressLines || !neighborhood || !hoursNote) {
    return null
  }

  return {
    phone,
    phoneDisplay,
    addressLines,
    neighborhood,
    hoursNote,
    hours: hours.length > 0 ? hours : fallbackCompanyInfo().hours,
    schedule: {
      openWeekdays:
        resolvedWeekdays.length > 0
          ? [...new Set(resolvedWeekdays)].sort((a, b) => a - b)
          : fallbackCompanyInfo().schedule.openWeekdays,
      lunchOpen,
      lunchClose,
    },
  }
}

export function companyInfoToRow(info: StoredCompanyInfo): Record<string, unknown> {
  return {
    id: 'default',
    phone: info.phone,
    phone_display: info.phoneDisplay,
    address_lines: info.addressLines,
    neighborhood: info.neighborhood,
    hours_note: info.hoursNote,
    hours: info.hours,
    open_weekdays: info.schedule.openWeekdays,
    lunch_open: info.schedule.lunchOpen,
    lunch_close: info.schedule.lunchClose,
  }
}

export function scheduleFromCompanyInfo(
  info: StoredCompanyInfo | null | undefined,
): OpeningSchedule {
  return info?.schedule ?? fallbackCompanyInfo().schedule
}

export function contactFromCompanyInfo(
  info: StoredCompanyInfo | null | undefined,
): { phone: string; phoneDisplay: string } {
  if (!info) {
    return {
      phone: restaurant.phone,
      phoneDisplay: restaurant.phoneDisplay,
    }
  }
  return {
    phone: info.phone,
    phoneDisplay: info.phoneDisplay,
  }
}

export function mergeVisitCopy(
  t: Copy,
  info: StoredCompanyInfo | null | undefined,
): Copy {
  if (!info) {
    return t
  }
  return {
    ...t,
    hoursNote: info.hoursNote,
    hours: info.hours,
    addressLines: info.addressLines,
    neighborhood: info.neighborhood,
  }
}
