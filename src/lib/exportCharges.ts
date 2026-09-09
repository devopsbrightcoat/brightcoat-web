// ---------------------------------------------------------------------------
// Genera un Excel con los cobros que estén visibles según los filtros
// aplicados en ese momento (ver botón "Exportar a Excel" en Cobros.tsx) y
// dispara su descarga en el navegador.
// ---------------------------------------------------------------------------

import ExcelJS from 'exceljs'
import type { Charge, Property, ServiceType } from '../types'

const STATUS_LABELS: Record<Charge['status'], string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
}

export const exportChargesToExcel = async (
  charges: Charge[],
  properties: Property[],
  serviceTypes: ServiceType[],
): Promise<void> => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Cobros')

  sheet.columns = [
    { header: 'Propiedad', key: 'property', width: 28 },
    { header: 'Apartamento', key: 'unit', width: 14 },
    { header: 'Servicio', key: 'service', width: 22 },
    { header: 'Fecha', key: 'date', width: 14 },
    { header: 'Descripción', key: 'description', width: 34 },
    { header: 'Monto', key: 'amount', width: 14 },
    { header: 'Estatus', key: 'status', width: 14 },
    { header: 'Invoice #', key: 'invoiceNumber', width: 18 },
  ]
  sheet.getRow(1).font = { bold: true }
  sheet.getColumn('amount').numFmt = '$#,##0'

  for (const c of charges) {
    const propertyName = properties.find((p) => p.id === c.propertyId)?.name
    const serviceTypeName = c.serviceTypeId ? serviceTypes.find((t) => t.id === c.serviceTypeId)?.name : undefined
    const base = c.description || c.notes || c.responsible || ''
    const extrasText = c.extras.length > 0 ? c.extras.map((e) => `${e.description} (${e.amount})`).join(', ') : ''
    const description = base && extrasText ? `${base} — ${extrasText}` : base || extrasText || '—'

    sheet.addRow({
      property: propertyName ?? '—',
      unit: c.unitLabel || '—',
      service: serviceTypeName ?? '—',
      date: c.generatedDate || '—',
      description,
      amount: c.amount,
      status: STATUS_LABELS[c.status],
      invoiceNumber: c.invoiceNumber || '—',
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `cobros-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
