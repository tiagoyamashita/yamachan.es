import { useMemo } from 'react'
import { scheduleFromCompanyInfo, type OpeningSchedule } from './companyInfo.ts'
import { type Copy, localeMeta, type Locale } from './i18n/index.ts'
import {
  pickupSlotsForDate,
  RESTAURANT_TIME_ZONE,
  todayKey,
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
  const today = todayKey()
  const slots = pickupSlotsForDate(today, new Date(), openingSchedule)
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(localeMeta[locale].htmlLang, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: RESTAURANT_TIME_ZONE,
      }).format(new Date()),
    [locale],
  )

  return (
    <div className="takeout-pickup">
      <fieldset className="reserve-times">
        <legend>{t.takeoutTimeLabel}</legend>
        <p className="muted">{todayLabel}</p>
        {slots.length === 0 ? (
          <p className="muted">{t.takeoutNoPickupTimes}</p>
        ) : (
          <div className="reserve-slot-list">
            {slots.map((time) => (
              <button
                key={time}
                type="button"
                className={
                  selectedDate === today && selectedTime === time
                    ? 'reserve-slot is-selected'
                    : 'reserve-slot'
                }
                aria-pressed={selectedDate === today && selectedTime === time}
                onClick={() => onSelect(today, time)}
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
