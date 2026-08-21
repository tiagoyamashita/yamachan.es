import {
  LOCALES,
  copy,
  isLocale,
  localeMeta,
  type Locale,
} from './i18n/index.ts'

export function LanguagePicker({
  locale,
  onChange,
}: {
  locale: Locale
  onChange: (locale: Locale) => void
}) {
  const t = copy[locale]
  return (
    <label className="lang-picker">
      <span className="visually-hidden">{t.languageLabel}</span>
      <select
        className="lang-btn"
        value={locale}
        aria-label={t.languageLabel}
        onChange={(event) => {
          const value = event.target.value
          if (isLocale(value)) {
            onChange(value)
          }
        }}
      >
        {LOCALES.map((id) => (
          <option key={id} value={id}>
            {localeMeta[id].shortLabel}
          </option>
        ))}
      </select>
    </label>
  )
}
