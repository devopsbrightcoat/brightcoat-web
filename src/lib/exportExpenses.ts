// ---------------------------------------------------------------------------
// Genera un Excel con los gastos que estén visibles según el buscador y los
// filtros aplicados en ese momento (ver botón "Exportar a Excel" en
// Gastos.tsx) y dispara su descarga en el navegador.
// ---------------------------------------------------------------------------

import ExcelJS from 'exceljs'
import type { Expense } from '../types'

export const exportExpensesToExcel = async (expenses: Expense[]): Promise<void> => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Gastos')

  sheet.columns = [
    { header: 'Factura', key: 'invoiceNumber', width: 20 },
    { header: 'Monto', key: 'amount', width: 14 },
    { header: 'Fecha', key: 'date', width: 14 },
    { header: 'Descripción', key: 'description', width: 40 },
  ]
  sheet.getRow(1).font = { bold: true }
  sheet.getColumn('amount').numFmt = '$#,##0'

  for (const e of expenses) {
    sheet.addRow({
      invoiceNumber: e.invoiceNumber || '—',
      amount: e.amount,
      date: e.date || '—',
      description: e.description || '—',
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `gastos-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
