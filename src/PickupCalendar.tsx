import { useMemo, useState } from 'react'
import { type Copy, type Locale } from './i18n/index.ts'
import { scheduleFromCompanyInfo, type OpeningSchedule } from './companyInfo.ts'
import {
  calendarCells,
  hasPickupSlots,
  monthFromKey,
  monthTitle,
  pickupSlotsForDate,
  shiftMonth,
  todayKey,
  weekdayLabels,
} from './openingHours.ts'

const MAX_MONTHS_AHEAD = 2

export function PickupCalendar({
  t,
  locale,
  selectedDate,
  selectedTime,
  onSelect,
  schedule,
}: {
  t: Copy
  locale: Locale
  selectedDate: string | null
  selectedTime: string
  onSelect: (date: string, time: string) => void
  schedule?: OpeningSchedule
}) {
  const openingSchedule = schedule ?? scheduleFromCompanyInfo(null)
  const today = todayKey()
  const min = monthFromKey(today)
  const max = shiftMonth(min.year, min.month, MAX_MONTHS_AHEAD)
  const initial = selectedDate ? monthFromKey(selectedDate) : min
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const weekdays = useMemo(() => weekdayLabels(locale), [locale])
  const cells = useMemo(() => calendarCells(year, month), [year, month])
  const atMinMonth = year === min.year && month === min.month
  const atMaxMonth = year === max.year && month === max.month
  const slots = selectedDate
    ? pickupSlotsForDate(selectedDate, new Date(), openingSchedule)
    : []

  return (
    <div className="takeout-pickup">
      <section className="reserve-calendar" aria-labelledby="takeout-date-heading">
        <div className="reserve-cal-head">
          <h2 id="takeout-date-heading">{t.reserveDateLabel}</h2>
          <div className="reserve-cal-nav">
            <button
              type="button"
              aria-label={t.reservePrevMonth}
              disabled={atMinMonth}
              onClick={() => {
                const next = shiftMonth(year, month, -1)
                setYear(next.year)
                setMonth(next.month)
              }}
            >
              ‹
            </button>
            <p>{monthTitle(locale, year, month)}</p>
            <button
              type="button"
              aria-label={t.reserveNextMonth}
              disabled={atMaxMonth}
              onClick={() => {
                const next = shiftMonth(year, month, 1)
                setYear(next.year)
                setMonth(next.month)
              }}
            >
              ›
            </button>
          </div>
        </div>
        <div className="reserve-grid" role="grid" aria-label={t.reserveDateLabel}>
          <div className="reserve-weekdays" role="row">
            {weekdays.map((label) => (
              <span key={label} role="columnheader">
                {label}
              </span>
            ))}
          </div>
          <div className="reserve-days" role="row">
            {cells.map((cell, index) => {
              const key = cell.key
              if (!key || cell.day === null) {
                return <span key={`pad-${index}`} className="reserve-day is-empty" />
              }
              const open = hasPickupSlots(key, new Date(), openingSchedule)
              const selected = selectedDate === key
              return (
                <button
                  key={key}
                  type="button"
                  className={
                    selected
                      ? 'reserve-day is-selected'
                      : open
                        ? 'reserve-day'
                        : 'reserve-day is-disabled'
                  }
                  disabled={!open}
                  aria-pressed={selected}
                  onClick={() => onSelect(key, '')}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <fieldset className="reserve-times">
        <legend>{t.takeoutTimeLabel}</legend>
        {!selectedDate ? (
          <p className="muted">{t.reservePickDate}</p>
        ) : slots.length === 0 ? (
          <p className="muted">{t.takeoutNoPickupTimes}</p>
        ) : (
          <div className="reserve-slot-list">
            {slots.map((time) => (
              <button
                key={time}
                type="button"
                className={
                  selectedTime === time ? 'reserve-slot is-selected' : 'reserve-slot'
                }
                aria-pressed={selectedTime === time}
                onClick={() => onSelect(selectedDate, time)}
              >
                {time}
              </button>
            ))}
          </div>
        )}
      </fieldset>
    </div>
  )
}
