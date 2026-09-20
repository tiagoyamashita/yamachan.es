import { MENU_CATEGORY_IDS, type StoredMenuItem } from './menu.ts'
import type { Copy } from './i18n/index.ts'

export type MenuJumpNavItem = {
  id: string
  name: string
  category_id: StoredMenuItem['category_id']
  sort_order: number
}

export function MenuJumpNav({
  items,
  currentId,
  label,
  categoryLabels,
  emptyLabel,
  includeEmptyCategories = true,
  onJump,
}: {
  items: MenuJumpNavItem[]
  currentId: string | null
  label: string
  categoryLabels: Copy['cartaCategories']
  emptyLabel: string
  includeEmptyCategories?: boolean
  onJump: (id: string) => void
}) {
  return (
    <nav className="admin-menu-nav" aria-label={label}>
      {MENU_CATEGORY_IDS.map((categoryId) => {
        const rows = items
          .filter((item) => item.category_id === categoryId)
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
        if (!includeEmptyCategories && rows.length === 0) {
          return null
        }
        return (
          <details key={categoryId} className="admin-menu-nav-cat">
            <summary>
              {categoryLabels[categoryId]}
              <span className="admin-menu-nav-count">{rows.length}</span>
            </summary>
            {rows.length === 0 ? (
              <p className="muted">{emptyLabel}</p>
            ) : (
              <ul>
                {rows.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={currentId === item.id ? 'is-current' : undefined}
                      onClick={() => onJump(item.id)}
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </details>
        )
      })}
    </nav>
  )
}
