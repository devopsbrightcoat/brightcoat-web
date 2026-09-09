// ---------------------------------------------------------------------------
// Genera un Excel con las planillas que estén visibles según el buscador y
// los filtros aplicados en ese momento (ver botón "Exportar a Excel" en
// Planillas.tsx) y dispara su descarga en el navegador. Incluye Ventas y
// Ganancia ya calculadas (a partir del desglose), más el desglose mismo como
// texto en una columna aparte — igual que Cobros hace con sus "extras".
// ---------------------------------------------------------------------------

import ExcelJS from 'exceljs'
import type { Employee, PayrollEntry, Property } from '../types'

export type PayrollExportRow = PayrollEntry & { sales: number; profit: number | null }

export const exportPayrollToExcel = async (
  entries: PayrollExportRow[],
  properties: Property[],
  employees: Employee[],
): Promise<void> => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Planillas')

  sheet.columns = [
    { header: 'Fecha', key: 'date', width: 14 },
    { header: 'Propiedad', key: 'property', width: 28 },
    { header: 'Unidad', key: 'unit', width: 14 },
    { header: 'Empleado', key: 'employee', width: 22 },
    { header: 'Servicio', key: 'service', width: 30 },
    { header: 'Desglose', key: 'breakdown', width: 40 },
    { header: 'Pago', key: 'amount', width: 14 },
    { header: 'Ventas', key: 'sales', width: 14 },
    { header: 'Ganancia', key: 'profit', width: 14 },
  ]
  sheet.getRow(1).font = { bold: true }
  sheet.getColumn('amount').numFmt = '$#,##0'
  sheet.getColumn('sales').numFmt = '$#,##0'
  sheet.getColumn('profit').numFmt = '$#,##0'

  for (const e of entries) {
    const propertyName = properties.find((p) => p.id === e.propertyId)?.name
    const employeeName = employees.find((emp) => emp.id === e.employeeId)?.name
    const breakdown = e.items.map((item) => `${item.description} (${item.amount})`).join(', ')

    sheet.addRow({
      date: e.date || '—',
      property: propertyName ?? '—',
      unit: e.unitLabel || '—',
      employee: employeeName ?? '—',
      service: e.serviceName || '—',
      breakdown: breakdown || '—',
      amount: e.amount ?? 'Pendiente',
      sales: e.sales,
      profit: e.profit ?? 'Pendiente',
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `planillas-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
