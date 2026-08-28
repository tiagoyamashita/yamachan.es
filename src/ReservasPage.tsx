import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from 'react'
import { contactFromCompanyInfo, mergeVisitCopy } from './companyInfo.ts'
import { type Copy, localeMeta, type Locale, whatsappUrl } from './i18n/index.ts'
import { useCompanyInfo } from './useCompanyInfo.ts'

type OccasionId = 'none' | 'birthday' | 'anniversary' | 'celebration'
type ReserveStep = 'date' | 'hours' | 'details'

type AvailabilitySlot = {
  start_datetime: string
  time_label: string
}

type DayAvailability = {
  date: string
  closed: boolean
  slot_count: number
}

type Booking = {
  startDatetime: string
  endDatetime: string | null
  partySize: number
  name: string
  tableLabel: string | null
  chatUrl?: string
  emailSent?: boolean
}

const MIN_GUESTS = 1
const MAX_GUESTS = 8
const OCCASIONS: OccasionId[] = [
  'none',
  'birthday',
  'anniversary',
  'celebration',
]
const STEPS: ReserveStep[] = ['date', 'hours', 'details']

function occasionLabel(t: Copy, id: OccasionId): string {
  switch (id) {
    case 'none':
      return t.reserveOccasionNone
    case 'birthday':
      return t.reserveOccasionBirthday
    case 'anniversary':
      return t.reserveOccasionAnniversary
    case 'celebration':
      return t.reserveOccasionCelebration
    default: {
      const _exhaustive: never = id
      return _exhaustive
    }
  }
}

function stepLabel(t: Copy, step: ReserveStep): string {
  switch (step) {
    case 'date':
      return t.reserveTabDate
    case 'hours':
      return t.reserveTabHours
    case 'details':
      return t.reserveTabDetails
    default: {
      const _exhaustive: never = step
      return _exhaustive
    }
  }
}

function weekdayLabels(locale: Locale): string[] {
  const lang = localeMeta[locale].htmlLang
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(2024, 0, 1 + index))
    return new Intl.DateTimeFormat(lang, {
      weekday: 'short',
      timeZone: 'UTC',
    }).format(date)
  })
}

function monthTitle(locale: Locale, year: number, month: number): string {
  return new Intl.DateTimeFormat(localeMeta[locale].htmlLang, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month, 1))
}

function dateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const next = new Date(year, month + delta, 1)
  return { year: next.getFullYear(), month: next.getMonth() }
}

function monthRange(year: number, month: number): { from: string; to: string } {
  const last = new Date(year, month + 1, 0).getDate()
  return { from: dateKey(year, month, 1), to: dateKey(year, month, last) }
}

function calendarCells(year: number, month: number): Array<{ day: number | null; key: string | null }> {
  const first = new Date(year, month, 1)
  const startWeekday = (first.getDay() + 6) % 7
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

function formatDateLong(locale: Locale, isoOrKey: string, timeZone?: string): string {
  const date = isoOrKey.includes('T')
    ? new Date(isoOrKey)
    : new Date(`${isoOrKey}T12:00:00`)
  return new Intl.DateTimeFormat(localeMeta[locale].htmlLang, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(timeZone ? { timeZone } : {}),
  }).format(date)
}

function formatTime(locale: Locale, iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(localeMeta[locale].htmlLang, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: locale !== 'ja',
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(iso))
}

function todayKey(timeZone = 'Europe/Madrid'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function ReservasPage({
  t,
  locale,
  onHome,
}: {
  t: Copy
  locale: Locale
  onHome: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  const companyInfo = useCompanyInfo()
  const visit = mergeVisitCopy(t, companyInfo)
  const contact = contactFromCompanyInfo(companyInfo)
  const now = new Date()
  const [step, setStep] = useState<ReserveStep>('date')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [guests, setGuests] = useState(2)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [days, setDays] = useState<DayAvailability[]>([])
  const [timezone, setTimezone] = useState('Europe/Madrid')
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [dayClosed, setDayClosed] = useState(false)
  const [daysLoading, setDaysLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [occasion, setOccasion] = useState<OccasionId>('none')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [booking, setBooking] = useState<Booking | null>(null)

  const weekdays = useMemo(() => weekdayLabels(locale), [locale])
  const cells = useMemo(() => calendarCells(year, month), [year, month])
  const dayByKey = useMemo(() => {
    const map = new Map<string, DayAvailability>()
    for (const day of days) {
      map.set(day.date, day)
    }
    return map
  }, [days])

  const minMonth = useMemo(() => {
    const today = todayKey(timezone)
    const [y, m] = today.split('-').map(Number)
    return { year: y, month: m - 1 }
  }, [timezone])
  const maxMonth = useMemo(() => shiftMonth(minMonth.year, minMonth.month, 2), [minMonth])
  const atMinMonth = year === minMonth.year && month === minMonth.month
  const atMaxMonth = year === maxMonth.year && month === maxMonth.month
  const stepIndex = STEPS.indexOf(step)

  useEffect(() => {
    const { from, to } = monthRange(year, month)
    const controller = new AbortController()
    setDaysLoading(true)
    setLoadError(null)
    void fetch(
      `/api/reservations/days?from=${from}&to=${to}&party_size=${guests}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null)
        if (!response.ok || !payload || typeof payload !== 'object') {
          throw new Error('load')
        }
        const row = payload as {
          timezone?: string
          days?: DayAvailability[]
          error?: string
        }
        if (row.error) {
          throw new Error(row.error)
        }
        setTimezone(row.timezone || 'Europe/Madrid')
        setDays(Array.isArray(row.days) ? row.days : [])
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        setDays([])
        setLoadError(error instanceof Error ? error.message : 'load')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setDaysLoading(false)
        }
      })
    return () => controller.abort()
  }, [year, month, guests])

  useEffect(() => {
    if (!selectedDate) {
      setSlots([])
      setDayClosed(false)
      setSelectedSlot(null)
      return
    }
    const controller = new AbortController()
    setSlotsLoading(true)
    setSelectedSlot(null)
    void fetch(
      `/api/reservations/availability?date=${selectedDate}&party_size=${guests}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null)
        if (!response.ok || !payload || typeof payload !== 'object') {
          throw new Error('load')
        }
        const row = payload as {
          slots?: AvailabilitySlot[]
          dayClosed?: boolean
          error?: string
        }
        if (row.error) {
          throw new Error(row.error)
        }
        setDayClosed(Boolean(row.dayClosed))
        setSlots(Array.isArray(row.slots) ? row.slots : [])
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        setSlots([])
        setLoadError(error instanceof Error ? error.message : 'load')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setSlotsLoading(false)
        }
      })
    return () => controller.abort()
  }, [selectedDate, guests])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedDate) {
      setFormError(t.reserveNeedDate)
      setStep('date')
      return
    }
    if (!selectedSlot) {
      setFormError(t.reserveNeedTime)
      setStep('hours')
      return
    }
    if (!name.trim() || !email.trim()) {
      setFormError(t.reserveNeedDetails)
      return
    }
    if (!isEmail(email)) {
      setFormError(t.reserveEmailRequired)
      return
    }

    const extra: string[] = []
    if (occasion !== 'none') {
      extra.push(occasionLabel(t, occasion))
    }
    if (notes.trim()) {
      extra.push(notes.trim())
    }

    setSubmitting(true)
    setFormError(null)
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          party_size: guests,
          start_datetime: selectedSlot.start_datetime,
          client_name: name.trim(),
          client_email: email.trim(),
          client_phone: phone.trim() || null,
          client_notes: extra.join(' · ') || null,
        }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok || !payload || typeof payload !== 'object') {
        throw new Error('submit')
      }
      const row = payload as { booking?: Booking; error?: string }
      if (!row.booking) {
        throw new Error(row.error || 'submit')
      }
      setBooking(row.booking)
      if (row.booking.chatUrl) {
        window.open(row.booking.chatUrl, '_blank', 'noopener,noreferrer')
      }
    } catch {
      setFormError(t.reserveSubmitError)
    } finally {
      setSubmitting(false)
    }
  }

  if (booking) {
    const formNotes = [
      occasion !== 'none' ? occasionLabel(t, occasion) : '',
      notes.trim(),
    ]
      .filter(Boolean)
      .join(' · ')
    const fallbackChatLines = [
      `${t.whatsappReserveText} ${name.trim()}.`,
      `${formatDateLong(locale, booking.startDatetime, timezone)} ${formatTime(locale, booking.startDatetime, timezone)} · ${String(booking.partySize)}.`,
      email.trim(),
    ]
    if (phone.trim()) {
      fallbackChatLines.push(phone.trim())
    }
    if (formNotes) {
      fallbackChatLines.push(formNotes)
    }
    const chatHref = booking.chatUrl || whatsappUrl(fallbackChatLines.join(' '))
    return (
      <article className="carta-page reserve-page" id="reservas">
        <div className="section-inner">
          <header className="section-head">
            <p className="kicker">{t.nav.reservar}</p>
            <h1>{t.reserveConfirmTitle}</h1>
            <p className="lead muted">{t.reserveConfirmLead}</p>
          </header>
          <dl className="reserve-summary">
            <div>
              <dt>{t.reserveDateLabel}</dt>
              <dd>{formatDateLong(locale, booking.startDatetime, timezone)}</dd>
            </div>
            <div>
              <dt>{t.reserveTimeLabel}</dt>
              <dd>{formatTime(locale, booking.startDatetime, timezone)}</dd>
            </div>
            <div>
              <dt>{t.reserveGuestsLabel}</dt>
              <dd>{booking.partySize}</dd>
            </div>
            <div>
              <dt>{t.reserveNameLabel}</dt>
              <dd>{booking.name}</dd>
            </div>
            {booking.tableLabel ? (
              <div>
                <dt>{t.reserveTableLabel}</dt>
                <dd>{booking.tableLabel}</dd>
              </div>
            ) : null}
          </dl>
          <p className="muted">{t.reserveConfirmChatLead}</p>
          {booking.emailSent ? (
            <p className="muted">{t.reserveConfirmEmailSent}</p>
          ) : null}
          <p className="carta-back">
            <a className="btn" href={chatHref} target="_blank" rel="noreferrer">
              {t.reserveConfirmChat}
            </a>
          </p>
          <p className="carta-back">
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => {
                setBooking(null)
                setSelectedSlot(null)
                setStep('date')
              }}
            >
              {t.reserveConfirmNew}
            </button>
          </p>
          <p className="carta-back">
            <a href="/" onClick={onHome}>
              {t.cartaBackHome}
            </a>
          </p>
        </div>
      </article>
    )
  }

  return (
    <article className="carta-page reserve-page" id="reservas">
      <div className="section-inner">
        <header className="section-head">
          <p className="kicker">{t.nav.reservar}</p>
          <h1>{t.reservePageHeading}</h1>
          <p className="lead muted">{t.reservePageLead}</p>
        </header>

        {loadError ? (
          <p className="takeout-error">{t.reserveUnavailable}</p>
        ) : null}

        <nav className="reserve-steps" aria-label={t.reserveStepsAria}>
          <ol>
            {STEPS.map((id, index) => {
              const done = index < stepIndex
              const current = id === step
              const unlocked =
                id === 'date' ||
                (id === 'hours' && Boolean(selectedDate)) ||
                (id === 'details' && Boolean(selectedDate && selectedSlot))
              return (
                <li
                  key={id}
                  className={
                    current ? 'is-current' : done ? 'is-done' : undefined
                  }
                >
                  <button
                    type="button"
                    disabled={!unlocked}
                    onClick={() => {
                      if (unlocked) {
                        setStep(id)
                        setFormError(null)
                      }
                    }}
                  >
                    <span className="reserve-step-index">{index + 1}</span>
                    <span>{stepLabel(t, id)}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        <div className="reserve-layout reserve-layout-tabs">
          {step === 'date' ? (
            <section className="reserve-calendar" aria-labelledby="reserve-date-heading">
              <div className="takeout-field">
                <span>{t.reserveGuestsLabel}</span>
                <div className="takeout-qty">
                  <button
                    type="button"
                    aria-label={t.reserveFewerGuests}
                    disabled={guests <= MIN_GUESTS}
                    onClick={() => setGuests((value) => Math.max(MIN_GUESTS, value - 1))}
                  >
                    −
                  </button>
                  <span>{guests}</span>
                  <button
                    type="button"
                    aria-label={t.reserveMoreGuests}
                    disabled={guests >= MAX_GUESTS}
                    onClick={() => setGuests((value) => Math.min(MAX_GUESTS, value + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="reserve-cal-head">
                <h2 id="reserve-date-heading">{t.reserveDateLabel}</h2>
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
                    if (!cell.key || cell.day === null) {
                      return <span key={`pad-${index}`} className="reserve-day is-empty" />
                    }
                    const info = dayByKey.get(cell.key)
                    const bookable = Boolean(info && !info.closed && info.slot_count > 0)
                    const selected = selectedDate === cell.key
                    return (
                      <button
                        key={cell.key}
                        type="button"
                        className={
                          selected
                            ? 'reserve-day is-selected'
                            : bookable
                              ? 'reserve-day'
                              : 'reserve-day is-disabled'
                        }
                        disabled={!bookable || daysLoading}
                        aria-pressed={selected}
                        onClick={() => {
                          setSelectedDate(cell.key)
                          setFormError(null)
                        }}
                      >
                        {cell.day}
                      </button>
                    )
                  })}
                </div>
              </div>
              {daysLoading ? <p className="muted">{t.reserveLoading}</p> : null}
              {formError && step === 'date' ? (
                <p className="takeout-error">{formError}</p>
              ) : null}
              <div className="reserve-frame-actions">
                <button
                  className="btn"
                  type="button"
                  disabled={!selectedDate}
                  onClick={() => {
                    if (!selectedDate) {
                      setFormError(t.reserveNeedDate)
                      return
                    }
                    setFormError(null)
                    setStep('hours')
                  }}
                >
                  {t.reserveContinue}
                </button>
              </div>
            </section>
          ) : null}

          {step === 'hours' ? (
            <section className="reserve-hours-step" aria-labelledby="reserve-time-heading">
              <p className="reserve-choice muted">
                {selectedDate
                  ? formatDateLong(locale, selectedDate, timezone)
                  : t.reservePickDate}{' '}
                · {guests} {t.reserveGuestsLabel.toLowerCase()}
              </p>
              <fieldset className="reserve-times">
                <legend id="reserve-time-heading">{t.reserveTimeLabel}</legend>
                {!selectedDate ? (
                  <p className="muted">{t.reservePickDate}</p>
                ) : slotsLoading ? (
                  <p className="muted">{t.reserveLoading}</p>
                ) : dayClosed || slots.length === 0 ? (
                  <p className="muted">{t.reserveNoTimes}</p>
                ) : (
                  <div className="reserve-slot-list">
                    {slots.map((slot) => (
                      <button
                        key={slot.start_datetime}
                        type="button"
                        className={
                          selectedSlot?.start_datetime === slot.start_datetime
                            ? 'reserve-slot is-selected'
                            : 'reserve-slot'
                        }
                        aria-pressed={
                          selectedSlot?.start_datetime === slot.start_datetime
                        }
                        onClick={() => {
                          setSelectedSlot(slot)
                          setFormError(null)
                        }}
                      >
                        {slot.time_label}
                      </button>
                    ))}
                  </div>
                )}
              </fieldset>

              <div className="hours reserve-hours">
                <h3>{visit.hoursTitle}</h3>
                <ul>
                  {visit.hours.map((row) => (
                    <li key={row.days}>
                      <span>{row.days}</span>
                      <b>{row.time}</b>
                    </li>
                  ))}
                </ul>
                <p className="hours-note">{visit.hoursNote}</p>
              </div>

              {formError && step === 'hours' ? (
                <p className="takeout-error">{formError}</p>
              ) : null}
              <div className="reserve-frame-actions">
                <button
                  className="btn btn-outline reserve-back"
                  type="button"
                  onClick={() => {
                    setStep('date')
                    setFormError(null)
                  }}
                >
                  {t.reserveBack}
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={!selectedSlot}
                  onClick={() => {
                    if (!selectedSlot) {
                      setFormError(t.reserveNeedTime)
                      return
                    }
                    setFormError(null)
                    setStep('details')
                  }}
                >
                  {t.reserveContinue}
                </button>
              </div>
            </section>
          ) : null}

          {step === 'details' ? (
            <section aria-labelledby="reserve-details-heading">
              <h2 className="reserve-details-heading" id="reserve-details-heading">
                {t.reserveDetailsHeading}
              </h2>
              <p className="reserve-choice muted">
                {selectedDate
                  ? formatDateLong(locale, selectedDate, timezone)
                  : '—'}
                {selectedSlot ? ` · ${selectedSlot.time_label}` : ''} · {guests}
              </p>
              <form className="takeout-form" onSubmit={(event) => void submit(event)}>
                <label className="takeout-field">
                  <span>{t.reserveNameLabel}</span>
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value)
                      setFormError(null)
                    }}
                  />
                </label>
                <label className="takeout-field">
                  <span>{t.reserveEmailLabel}</span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setFormError(null)
                    }}
                  />
                </label>
                <p className="muted">{t.reserveEmailRequired}</p>
                <label className="takeout-field">
                  <span>{t.reservePhoneLabel}</span>
                  <input
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </label>
                <label className="takeout-field">
                  <span>{t.reserveOccasionLabel}</span>
                  <select
                    value={occasion}
                    onChange={(event) => {
                      const value = event.target.value
                      switch (value) {
                        case 'none':
                        case 'birthday':
                        case 'anniversary':
                        case 'celebration':
                          setOccasion(value)
                          break
                        default:
                          setOccasion('none')
                      }
                    }}
                  >
                    {OCCASIONS.map((id) => (
                      <option key={id} value={id}>
                        {occasionLabel(t, id)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="takeout-field">
                  <span>{t.reserveNotesLabel}</span>
                  <textarea
                    name="notes"
                    rows={3}
                    placeholder={t.reserveNotesPlaceholder}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </label>
                {formError ? <p className="takeout-error">{formError}</p> : null}
                <p className="takeout-pickup-note">{t.reserveNote}</p>
                <div className="reserve-frame-actions">
                  <button
                    className="btn btn-outline reserve-back"
                    type="button"
                    onClick={() => {
                      setStep('hours')
                      setFormError(null)
                    }}
                  >
                    {t.reserveBack}
                  </button>
                  <button className="btn" type="submit" disabled={submitting}>
                    {submitting ? t.reserveSubmitting : t.reserveSubmit}
                  </button>
                </div>
              </form>
              <p className="reserve-alt">
                <a href={whatsappUrl(t.whatsappReserveText)}>{visit.whatsapp}</a>
                {' · '}
                <a href={`tel:${contact.phone}`}>
                  {visit.call} {contact.phoneDisplay}
                </a>
              </p>
            </section>
          ) : null}
        </div>

        <p className="carta-back">
          <a href="/" onClick={onHome}>
            {t.cartaBackHome}
          </a>
        </p>
      </div>
    </article>
  )
}
