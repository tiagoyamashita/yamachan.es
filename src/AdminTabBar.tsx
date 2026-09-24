type AdminTabOption<T extends string> = {
  id: T
  label: string
}

export function AdminTabBar<T extends string>({
  value,
  options,
  ariaLabel,
  onChange,
  variant = 'tabs',
}: {
  value: T
  options: readonly AdminTabOption<T>[]
  ariaLabel: string
  onChange: (id: T) => void
  variant?: 'tabs' | 'subtabs'
}) {
  return (
    <div
      className={`admin-tab-nav${variant === 'subtabs' ? ' admin-tab-nav-subtabs' : ''}`}
    >
      <label className="admin-tabs-select-wrap">
        <span className="visually-hidden">{ariaLabel}</span>
        <select
          className="admin-tabs-select"
          value={value}
          aria-label={ariaLabel}
          onChange={(event) => {
            const next = options.find((option) => option.id === event.target.value)
            if (next) {
              onChange(next.id)
            }
          }}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div
        className={`admin-tabs${variant === 'subtabs' ? ' admin-subtabs' : ''}`}
        role="tablist"
        aria-label={ariaLabel}
      >
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            className={`admin-tab${value === option.id ? ' is-active' : ''}`}
            aria-selected={value === option.id}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
