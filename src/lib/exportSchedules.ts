// ---------------------------------------------------------------------------
// Genera un Excel con los horarios del día seleccionado (ver botón
// "Exportar a Excel" en Horarios.tsx) y dispara su descarga en el navegador.
// ---------------------------------------------------------------------------

import ExcelJS from 'exceljs'
import type { Schedule } from '../types'

const STATUS_LABELS: Record<Schedule['status'], string> = {
  pending: 'Pendiente',
  in_progress: 'En proceso',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  rescheduled: 'Reagendado',
}

export const exportSchedulesToExcel = async (
  schedules: Schedule[],
  propertyMap: Map<string, string>,
  serviceTypeMap: Map<string, string>,
  employeeMap: Map<string, string>,
  dateIso: string,
): Promise<void> => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Horarios')

  sheet.columns = [
    { header: 'Propiedad', key: 'property', width: 28 },
    { header: 'Unidad', key: 'unit', width: 14 },
    { header: 'Servicio', key: 'service', width: 22 },
    { header: 'Empleado', key: 'employee', width: 22 },
    { header: 'Estatus', key: 'status', width: 16 },
  ]
  sheet.getRow(1).font = { bold: true }

  for (const s of schedules) {
    sheet.addRow({
      property: propertyMap.get(s.propertyId) ?? '—',
      unit: s.unitLabel || '—',
      service: serviceTypeMap.get(s.serviceTypeId) ?? '—',
      employee: employeeMap.get(s.employeeId) ?? '—',
      status: STATUS_LABELS[s.status],
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `horarios-${dateIso}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
