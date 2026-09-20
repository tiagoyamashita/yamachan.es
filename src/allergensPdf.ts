import { jsPDF } from 'jspdf'
import autoTable, { type RowInput } from 'jspdf-autotable'
import { displayMenuItem, groupMenuByCategory, type StoredMenuItem } from './menu.ts'
import type { Copy, Locale } from './i18n/index.ts'

const PDF_FILENAME = 'yamachan-alergenos.pdf'

export function buildAllergensPdfBody(
  items: StoredMenuItem[],
  locale: Locale,
  t: Copy,
): RowInput[] {
  const groups = groupMenuByCategory(items.filter((item) => item.published))
  const body: RowInput[] = []

  for (const group of groups) {
    body.push([
      {
        content: t.cartaCategories[group.id],
        colSpan: 2,
        styles: { fontStyle: 'bold', fillColor: [240, 234, 226] },
      },
    ])
    for (const item of group.items) {
      const { name } = displayMenuItem(item, locale)
      const allergenNames = item.allergens.map((id) => t.cartaAllergens[id])
      body.push([
        name,
        allergenNames.length > 0 ? allergenNames.join(', ') : t.adminAllergensNone,
      ])
    }
  }

  return body
}

export function downloadAllergensPdf(
  items: StoredMenuItem[],
  locale: Locale,
  t: Copy,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const marginX = 40

  doc.setFontSize(16)
  doc.text(t.adminAllergensPdfTitle, marginX, 46)
  doc.setFontSize(9)
  doc.setTextColor(110)
  doc.text(t.adminAllergensPdfNote, marginX, 62)
  doc.setTextColor(0)

  autoTable(doc, {
    startY: 78,
    margin: { left: marginX, right: marginX },
    head: [[t.adminAllergensColumnDish, t.adminAllergensColumnAllergens]],
    body: buildAllergensPdfBody(items, locale, t),
    styles: { fontSize: 10, cellPadding: 6, valign: 'top' },
    headStyles: { fillColor: [190, 60, 40], textColor: 255 },
    columnStyles: { 0: { cellWidth: 200 } },
  })

  doc.save(PDF_FILENAME)
}
