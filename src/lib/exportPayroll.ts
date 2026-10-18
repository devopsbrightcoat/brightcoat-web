
import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Employee, PayrollEntry, Property } from '../types'
import { fetchCompanyInfoForPdf } from './companyInfo'
import { LOGO_ASPECT_RATIO, LOGO_PLATE_COLOR, LOGO_URL, loadImageAsDataUrl } from './pdfAssets'

export type PayrollExportRow = PayrollEntry & { sales: number; profit: number | null }

export type PayrollExportAudience = 'admin' | 'employee'

export type PayrollExportOptions = {
  // Nombre del empleado, cuando el export está filtrado a uno solo — se usa
  // en el nombre del archivo.
  employeeName?: string
  // 'admin' (por defecto) incluye todo, igual que siempre. 'employee' quita
  // Notas, Cobro y Ganancia — lo que no debe ver el empleado.
  audience?: PayrollExportAudience
}

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

// Convierte un nombre a algo seguro para usar como nombre de archivo (sin
// acentos, espacios ni símbolos) — ej. "José Pérez" -> "jose-perez".
const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const buildExportFilename = (employeeName: string | undefined, extension: string) => {
  const dateSuffix = new Date().toISOString().slice(0, 10)
  return employeeName ? `${slugify(employeeName)}-planilla-${dateSuffix}.${extension}` : `planillas-${dateSuffix}.${extension}`
}

// Junta, para cada empleado presente en `entries`, el total de Pago — se usa
// para la fila/línea de "Total pagado a..." al final del export, igual en
// Excel que en PDF.
const sumByEmployee = (entries: PayrollExportRow[]) => {
  const order: string[] = []
  const totals = new Map<string, number>()
  for (const e of entries) {
    if (!totals.has(e.employeeId)) {
      order.push(e.employeeId)
      totals.set(e.employeeId, 0)
    }
    totals.set(e.employeeId, (totals.get(e.employeeId) ?? 0) + e.sales)
  }
  return { order, totals }
}

export const exportPayrollToExcel = async (
  entries: PayrollExportRow[],
  properties: Property[],
  employees: Employee[],
  options: PayrollExportOptions = {},
): Promise<void> => {
  const { employeeName, audience = 'admin' } = options
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Planillas')

  sheet.columns = [
    { header: 'Fecha', key: 'date', width: 14 },
    { header: 'Propiedad', key: 'property', width: 28 },
    { header: 'Unidad', key: 'unit', width: 14 },
    { header: 'Empleado', key: 'employee', width: 22 },
    { header: 'Servicio', key: 'service', width: 32 },
    ...(audience === 'admin' ? [{ header: 'Notas', key: 'notes', width: 30 }] : []),
    ...(audience === 'admin' ? [{ header: 'Cobro', key: 'amount', width: 14 }] : []),
    { header: 'Pago', key: 'sales', width: 14 },
    ...(audience === 'admin' ? [{ header: 'Ganancia', key: 'profit', width: 14 }] : []),
  ]
  sheet.getRow(1).font = { bold: true }
  if (audience === 'admin') sheet.getColumn('amount').numFmt = '$#,##0'
  sheet.getColumn('sales').numFmt = '$#,##0'
  if (audience === 'admin') sheet.getColumn('profit').numFmt = '$#,##0'

  // Cada planilla ocupa una fila "principal" con todos sus datos, seguida de
  // una fila por cada línea de su desglose (solo Servicio + Pago, en cursiva
  // y con sangría, sin repetir propiedad/unidad/empleado/fecha) — en vez de
  // amontonar el desglose en una sola celda de texto como antes. Las llaves
  // que no correspondan a una columna definida arriba (notes/amount/profit
  // cuando audience === 'employee') simplemente se ignoran.
  const TOP_DIVIDER = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } } } as const

  for (const e of entries) {
    const propertyName = properties.find((p) => p.id === e.propertyId)?.name
    const rowEmployeeName = employees.find((emp) => emp.id === e.employeeId)?.name

    const mainRow = sheet.addRow({
      date: e.date || '—',
      property: propertyName ?? '—',
      unit: e.unitLabel || '—',
      employee: rowEmployeeName ?? '—',
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

  const { order: employeeOrder, totals: totalsByEmployee } = sumByEmployee(entries)

  if (employeeOrder.length > 0) {
    sheet.addRow({})

    for (const employeeId of employeeOrder) {
      const rowEmployeeName = employees.find((emp) => emp.id === employeeId)?.name ?? '—'
      const totalRow = sheet.addRow({
        service: `Total pagado a ${rowEmployeeName}`,
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
  link.download = buildExportFilename(employeeName, 'xlsx')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const exportPayrollToPdf = async (
  entries: PayrollExportRow[],
  properties: Property[],
  employees: Employee[],
  options: PayrollExportOptions = {},
): Promise<void> => {
  const { employeeName, audience = 'admin' } = options

  const head =
    audience === 'admin'
      ? ['Fecha', 'Propiedad', 'Unidad', 'Empleado', 'Servicio', 'Notas', 'Cobro', 'Pago', 'Ganancia']
      : ['Fecha', 'Propiedad', 'Unidad', 'Empleado', 'Servicio', 'Pago']
  const serviceIdx = head.indexOf('Servicio')
  const salesIdx = head.indexOf('Pago')

  const body: string[][] = []
  // Marca, por índice de fila, cuáles filas son la entrada principal (día/unidad/
  // servicio) para que el PDF las resalte en negrita y el desglose se vea normal.
  const bodyIsMain: boolean[] = []
  for (const e of entries) {
    const propertyName = properties.find((p) => p.id === e.propertyId)?.name ?? '—'
    const rowEmployeeName = employees.find((emp) => emp.id === e.employeeId)?.name ?? '—'

    const row =
      audience === 'admin'
        ? [
            e.date || '—',
            propertyName,
            e.unitLabel || '—',
            rowEmployeeName,
            e.serviceName || '—',
            e.notes || '—',
            e.amount == null ? 'Pendiente' : currency(e.amount),
            currency(e.sales),
            e.profit == null ? 'Pendiente' : currency(e.profit),
          ]
        : [e.date || '—', propertyName, e.unitLabel || '—', rowEmployeeName, e.serviceName || '—', currency(e.sales)]
    body.push(row)
    bodyIsMain.push(true)

    for (const item of e.items) {
      const itemRow = new Array(head.length).fill('')
      itemRow[serviceIdx] = `    • ${item.description}`
      itemRow[salesIdx] = currency(item.amount)
      body.push(itemRow)
      bodyIsMain.push(false)
    }
  }

  const { order: employeeOrder, totals: totalsByEmployee } = sumByEmployee(entries)

  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 14

  // Encabezado con los datos de la empresa (los mismos que se editan en
  // Configuración > General) y el logo arriba a la derecha.
  const company = await fetchCompanyInfoForPdf()
  let headerY = 14
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(30, 31, 37)
  doc.text(company.companyName, marginX, headerY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  headerY += 5
  doc.text(company.address, marginX, headerY)
  headerY += 5
  doc.text(`${company.email}   ·   ${company.phone}`, marginX, headerY)

  try {
    const logoDataUrl = await loadImageAsDataUrl(LOGO_URL)
    const logoWidth = 26
    const logoHeight = logoWidth * LOGO_ASPECT_RATIO
    const logoX = pageWidth - marginX - logoWidth
    const logoY = 6
    // Placa navy detrás del logo para que el texto plateado resalte sobre
    // el fondo blanco del PDF (ver nota en pdfAssets.ts).
    const platePadding = 2.5
    doc.setFillColor(...LOGO_PLATE_COLOR)
    doc.roundedRect(
      logoX - platePadding,
      logoY - platePadding,
      logoWidth + platePadding * 2,
      logoHeight + platePadding * 2,
      1.5,
      1.5,
      'F',
    )
    doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight)
  } catch {
    // Si el logo no carga (ej. sin conexión al generar el PDF), seguimos sin
    // romper la descarga — el PDF sale sin logo pero con el resto del
    // encabezado.
  }

  headerY += 6
  doc.setDrawColor(226, 232, 240)
  doc.line(marginX, headerY, pageWidth - marginX, headerY)

  headerY += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text(employeeName ? `Planilla — ${employeeName}` : 'Planillas', marginX, headerY)
  doc.setFont('helvetica', 'normal')

  autoTable(doc, {
    startY: headerY + 5,
    head: [head],
    body,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 31, 37] },
    columnStyles: { [serviceIdx]: { cellWidth: 55 } },
    didParseCell: (data) => {
      // Fila principal (día/unidad/servicio) en negrita; desglose normal, para
      // que no se confundan visualmente.
      if (data.section === 'body' && bodyIsMain[data.row.index]) {
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  let finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 20

  if (employeeOrder.length > 0) {
    doc.setFontSize(10)
    for (const employeeId of employeeOrder) {
      const rowEmployeeName = employees.find((emp) => emp.id === employeeId)?.name ?? '—'
      finalY += 7
      doc.text(`Total pagado a ${rowEmployeeName}: ${currency(totalsByEmployee.get(employeeId) ?? 0)}`, 14, finalY)
    }

    if (employeeOrder.length > 1) {
      const grandTotal = Array.from(totalsByEmployee.values()).reduce((sum, v) => sum + v, 0)
      finalY += 9
      doc.setFontSize(11)
      doc.text(`Total general: ${currency(grandTotal)}`, 14, finalY)
    }
  }

  doc.save(buildExportFilename(employeeName, 'pdf'))
}
