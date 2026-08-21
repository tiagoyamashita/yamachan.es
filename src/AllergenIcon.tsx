import type { ReactNode } from 'react'
import { ALLERGEN_IDS, type AllergenId } from './allergens.ts'

function graphic(id: AllergenId): ReactNode {
  switch (id) {
    case 'gluten':
      return (
        <>
          <path d="M12 21V8" />
          <path d="M12 9c2-1.4 3.6-3.6 4-6-2.2.8-3.6 2.2-4 4.2" />
          <path d="M12 9c-2-1.4-3.6-3.6-4-6 2.2.8 3.6 2.2 4 4.2" />
          <path d="M12 13c2-1.1 3.7-2.8 4.1-5-2.2.7-3.6 1.9-4.1 3.6" />
          <path d="M12 13c-2-1.1-3.7-2.8-4.1-5 2.2.7 3.6 1.9 4.1 3.6" />
          <path d="M12 17c1.8-.9 3.3-2.3 3.7-4.2-2 .6-3.2 1.7-3.7 3.2" />
          <path d="M12 17c-1.8-.9-3.3-2.3-3.7-4.2 2 .6 3.2 1.7 3.7 3.2" />
        </>
      )
    case 'crustaceans':
      return (
        <>
          <path d="M5 16c2 3 6 4 9 2 3-2 5-6 4-9" />
          <path d="M18 9c1.2-1.6 1.4-3.4.4-4.4" />
          <path d="M16.5 8.2c.8-1.8.6-3.6-.6-4.4" />
          <path d="M7 15.5 4 19" />
          <path d="M8.6 17.2 6.2 21" />
          <path d="M10.8 18.2 9.2 21.4" />
          <circle cx="17.2" cy="10.2" r="0.7" fill="currentColor" />
        </>
      )
    case 'eggs':
      return <path d="M12 20c3.6 0 5.5-3.2 5.5-7.2C17.5 8.2 14.8 4 12 4S6.5 8.2 6.5 12.8C6.5 16.8 8.4 20 12 20Z" />
    case 'fish':
      return (
        <>
          <path d="M4 12c5-5 11-6 16-4-1.5 2-1.5 6 0 8-5 2-11 1-16-4Z" />
          <path d="M4 12 2 8v8l2-4Z" />
          <circle cx="16.4" cy="10.2" r="0.7" fill="currentColor" />
        </>
      )
    case 'peanuts':
      return (
        <>
          <path d="M8.2 15.6c-1.8-1.8-1.6-5 .6-6.4 1.6-1 3.4-.4 4.2 1.2 1.8 1.8 1.6 5-.6 6.4-1.6 1-3.4.4-4.2-1.2Z" />
          <path d="M11.8 13.6c1.8-1.8 5-1.6 6.4.6 1 1.6.4 3.4-1.2 4.2-1.8 1.8-5 1.6-6.4-.6-1-1.6-.4-3.4 1.2-4.2Z" />
        </>
      )
    case 'soy':
      return (
        <>
          <path d="M8 16.5c0-3.2 2.2-6.4 5.2-7.6 0 4.2-1.8 7.8-5.2 7.6Z" />
          <path d="M14.5 17c.2-3.4 2.2-6.4 5-7.2-.2 4-2.2 7.4-5 7.2Z" />
          <path d="M11.2 9.2C12 6.4 14.6 4.4 18 4c-.4 3.2-2.6 5.4-5.6 5.6" />
        </>
      )
    case 'milk':
      return (
        <>
          <path d="M8 9.5 9.2 4h5.6L16 9.5v11H8V9.5Z" />
          <path d="M8.4 9.5h7.2" />
          <path d="M10 4 9.4 6.4h5.2L14 4" />
        </>
      )
    case 'nuts':
      return (
        <>
          <path d="M12 20c3.4 0 5.5-3.4 5.5-7.2 0-4.2-2.2-8.8-5.5-8.8S6.5 8.6 6.5 12.8C6.5 16.6 8.6 20 12 20Z" />
          <path d="M12 4.2v15.4" />
        </>
      )
    case 'celery':
      return (
        <>
          <path d="M9 21V8.5c0-3 1.2-5.5 3-6.5" />
          <path d="M12 21V8c0-2.6 1.4-5.2 3.4-6.2" />
          <path d="M15 21V9.2c0-2.4 1-4.6 2.6-5.6" />
          <path d="M8.6 10.5c1.4.8 2.8.6 4-.2" />
          <path d="M11.5 12c1.6.7 3.2.4 4.6-.4" />
        </>
      )
    case 'mustard':
      return (
        <>
          <path d="M9 10h6l.8 11H8.2L9 10Z" />
          <path d="M10.2 10V7.2c0-2 1.4-3.4 3.3-3.2.8.1 1.5.6 1.5 1.6v.6" />
          <path d="M10.5 14.5h3.2" />
        </>
      )
    case 'sesame':
      return (
        <>
          <ellipse cx="8" cy="8.5" rx="2" ry="3.1" transform="rotate(-28 8 8.5)" />
          <ellipse cx="14.5" cy="7.5" rx="2" ry="3.1" transform="rotate(18 14.5 7.5)" />
          <ellipse cx="9.5" cy="15.5" rx="2" ry="3.1" transform="rotate(-12 9.5 15.5)" />
          <ellipse cx="16.2" cy="14.8" rx="2" ry="3.1" transform="rotate(32 16.2 14.8)" />
        </>
      )
    case 'sulphites':
      return (
        <>
          <path d="M9 8h6l1.6 3.2V20H7.4v-8.8L9 8Z" />
          <path d="M9 8V5h6v3" />
          <path d="M10.4 13.2c.6 1.2 2.6 1.2 3.2 0" />
        </>
      )
    case 'lupin':
      return (
        <>
          <path d="M12 13 8.6 7.2 12 5.4l3.4 1.8L12 13Z" />
          <path d="M12 13 6.4 12.2 5.2 8.2 8.6 7.2" />
          <path d="M12 13 15.4 7.2 18.8 8.2 17.6 12.2" />
          <path d="M12 13 8.2 17.2 12 20.4l3.8-3.2L12 13Z" />
          <path d="M12 13v8" />
        </>
      )
    case 'molluscs':
      return (
        <>
          <path d="M19 13.5c0 4.2-3.2 7.5-8.2 7.5C6 21 3 17.4 3 13.2 3 8.2 7.2 4.4 12.4 5.2c2 .3 3.4 1.8 3.4 3.6 0 1.8-1.4 3-3.2 3-1.4 0-2.3-1-2.3-2.1" />
          <path d="M8.2 13.6c.8 2.4 3 4 5.6 4" />
        </>
      )
    default: {
      const _exhaustive: never = id
      return _exhaustive
    }
  }
}

export function AllergenIcon({ id }: { id: AllergenId }) {
  return (
    <svg
      className="allergen-icon"
      viewBox="0 0 24 24"
      width="1.15em"
      height="1.15em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {graphic(id)}
    </svg>
  )
}

export function AllergenMarks({
  ids,
  names,
  label,
}: {
  ids: AllergenId[] | undefined
  names: Record<AllergenId, string>
  label: string
}) {
  const selected = ids ?? []
  if (selected.length === 0) {
    return null
  }
  return (
    <ul className="carta-allergens" aria-label={label}>
      {selected.map((id) => (
        <li key={id}>
          <AllergenIcon id={id} />
          <span>{names[id]}</span>
        </li>
      ))}
    </ul>
  )
}

export function AllergenLegend({
  names,
  label,
}: {
  names: Record<AllergenId, string>
  label: string
}) {
  return (
    <section className="carta-allergen-legend" aria-label={label}>
      <h2>{label}</h2>
      <ul>
        {ALLERGEN_IDS.map((id) => (
          <li key={id}>
            <AllergenIcon id={id} />
            <span>{names[id]}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
