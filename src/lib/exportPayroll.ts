
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
    { header: 'Servicio', key: 'service', width: 32 },
    { header: 'Notas', key: 'notes', width: 30 },
    { header: 'Cobro', key: 'amount', width: 14 },
    { header: 'Pago', key: 'sales', width: 14 },
    { header: 'Ganancia', key: 'profit', width: 14 },
  ]
  sheet.getRow(1).font = { bold: true }
  sheet.getColumn('amount').numFmt = '$#,##0'
  sheet.getColumn('sales').numFmt = '$#,##0'
  sheet.getColumn('profit').numFmt = '$#,##0'

  // Cada planilla ocupa una fila "principal" con todos sus datos, seguida de
  // una fila por cada línea de su desglose (solo Servicio + Pago, en cursiva
  // y con sangría, sin repetir propiedad/unidad/empleado/fecha) — en vez de
  // amontonar el desglose en una sola celda de texto como antes.
  const TOP_DIVIDER = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } } } as const

  for (const e of entries) {
    const propertyName = properties.find((p) => p.id === e.propertyId)?.name
    const employeeName = employees.find((emp) => emp.id === e.employeeId)?.name

    const mainRow = sheet.addRow({
      date: e.date || '—',
      property: propertyName ?? '—',
      unit: e.unitLabel || '—',
      employee: employeeName ?? '—',
      service: e.serviceName || '—',
      notes: e.notes || '—',
      amount: e.amount ?? 'Pendiente',
      sales: e.sales,
      profit: e.profit ?? 'Pendiente',
    })
    mainRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = TOP_DIVIDER
    })

    for (const item of e.items) {
      const itemRow = sheet.addRow({
        service: `    • ${item.description}`,
        sales: item.amount,
      })
      itemRow.font = { italic: true, color: { argb: 'FF64748B' } }
    }
  }

  const employeeOrder: string[] = []
  const totalsByEmployee = new Map<string, number>()
  for (const e of entries) {
    if (!totalsByEmployee.has(e.employeeId)) {
      employeeOrder.push(e.employeeId)
      totalsByEmployee.set(e.employeeId, 0)
    }
    totalsByEmployee.set(e.employeeId, (totalsByEmployee.get(e.employeeId) ?? 0) + e.sales)
  }

  if (employeeOrder.length > 0) {
    sheet.addRow({})

    for (const employeeId of employeeOrder) {
      const employeeName = employees.find((emp) => emp.id === employeeId)?.name ?? '—'
      const totalRow = sheet.addRow({
        service: `Total pagado a ${employeeName}`,
        sales: totalsByEmployee.get(employeeId) ?? 0,
      })
      totalRow.font = { bold: true }
    }

    if (employeeOrder.length > 1) {
      const grandTotal = Array.from(totalsByEmployee.values()).reduce((sum, v) => sum + v, 0)
      sheet.addRow({})
      const grandTotalRow = sheet.addRow({ service: 'Total general', sales: grandTotal })
      grandTotalRow.font = { bold: true }
    }
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
