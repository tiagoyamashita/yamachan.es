import { useEffect, useMemo, useState } from 'react'
import { scheduleFromCompanyInfo, type OpeningSchedule } from './companyInfo.ts'
import { type Copy, localeMeta, type Locale } from './i18n/index.ts'
import {
  calendarCells,
  hasPickupSlots,
  lastPickupKey,
  monthFromKey,
  monthTitle,
  pickupSlotsForDate,
  RESTAURANT_TIME_ZONE,
  shiftMonth,
  todayKey,
  weekdayLabels,
} from './openingHours.ts'

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
  const now = new Date()
  const today = todayKey(now)
  const lastKey = lastPickupKey(now)
  const activeDate = selectedDate && selectedDate >= today ? selectedDate : today
  const initialMonth = monthFromKey(activeDate)
  const [year, setYear] = useState(initialMonth.year)
  const [month, setMonth] = useState(initialMonth.month)
  const minMonth = monthFromKey(today)
  const maxMonth = monthFromKey(lastKey)
  const atMinMonth =
    year < minMonth.year ||
    (year === minMonth.year && month <= minMonth.month)
  const atMaxMonth =
    year > maxMonth.year ||
    (year === maxMonth.year && month >= maxMonth.month)
  const weekdays = useMemo(() => weekdayLabels(locale), [locale])
  const cells = calendarCells(year, month)
  const slots = pickupSlotsForDate(activeDate, now, openingSchedule)
  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(localeMeta[locale].htmlLang, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: RESTAURANT_TIME_ZONE,
      }).format(new Date(`${activeDate}T12:00:00Z`)),
    [activeDate, locale],
  )

  useEffect(() => {
    const next = monthFromKey(activeDate)
    setYear(next.year)
    setMonth(next.month)
  }, [activeDate])

  return (
    <div className="takeout-pickup">
      <div className="reserve-cal-head">
        <h2>{t.reserveDateLabel}</h2>
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
            const date = cell.key
            if (!date || cell.day === null) {
              return <span key={`pad-${index}`} className="reserve-day is-empty" />
            }
            const bookable = hasPickupSlots(date, now, openingSchedule)
            const selected = activeDate === date
            return (
              <button
                key={date}
                type="button"
                className={
                  selected
                    ? 'reserve-day is-selected'
                    : bookable
                      ? 'reserve-day'
                      : 'reserve-day is-disabled'
                }
                disabled={!bookable}
                aria-pressed={selected}
                onClick={() => {
                  const nextSlots = pickupSlotsForDate(
                    date,
                    now,
                    openingSchedule,
                  )
                  const time = nextSlots.includes(selectedTime)
                    ? selectedTime
                    : ''
                  onSelect(date, time)
                }}
              >
                {cell.day}
              </button>
            )
          })}
        </div>
      </div>
      <fieldset className="reserve-times">
        <legend>{t.takeoutTimeLabel}</legend>
        <p className="muted">{dateLabel}</p>
        {slots.length === 0 ? (
          <p className="muted">{t.takeoutNoPickupTimes}</p>
        ) : (
          <div className="reserve-slot-list">
            {slots.map((time) => (
              <button
                key={time}
                type="button"
                className={
                  selectedDate === activeDate && selectedTime === time
                    ? 'reserve-slot is-selected'
                    : 'reserve-slot'
                }
                aria-pressed={
                  selectedDate === activeDate && selectedTime === time
                }
                onClick={() => onSelect(activeDate, time)}
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
