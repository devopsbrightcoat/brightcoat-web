
import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Employee, PayrollEntry, Property } from '../types'
import { fetchCompanyInfoForPdf } from './companyInfo'
import { FIXED_CHARGE_LABEL } from './payrollStatus'
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
  // Rango de fechas ya formateado para mostrar (ej. "14 Oct – 28 Oct") — se
  // imprime debajo del título en el PDF. Solo afecta el PDF, no el Excel.
  periodLabel?: string
}

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

// Mismos tonos dorados que usa exportEstimate.ts, para la caja que resalta
// el total pagado.
const GOLD = [207, 145, 34] as const
const GOLD_BG = [253, 247, 231] as const
const GOLD_DARK = [120, 90, 20] as const

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
      amount: e.isFixedCharge ? FIXED_CHARGE_LABEL : (e.amount ?? 'Pendiente'),
      sales: e.sales,
      profit: e.isFixedCharge ? '—' : (e.profit ?? 'Pendiente'),
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
  const { employeeName, audience = 'admin', periodLabel } = options

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
            e.isFixedCharge ? FIXED_CHARGE_LABEL : e.amount == null ? 'Pendiente' : currency(e.amount),
            currency(e.sales),
            e.isFixedCharge ? '—' : e.profit == null ? 'Pendiente' : currency(e.profit),
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

  // Encabezado con el nombre de la empresa (el mismo que se edita en
  // Configuración > General) y el logo arriba a la derecha — en la planilla
  // no hace falta repetir dirección ni contacto.
  //
  // El nombre de la empresa queda centrado verticalmente contra el logo (con
  // su placa navy) en vez de una posición fija, y la línea separadora se
  // dibuja después del punto más bajo de esa placa — así el logo nunca
  // termina encimado sobre la línea, sin importar qué tan grande salga.
  const company = await fetchCompanyInfoForPdf()
  const logoWidth = 26
  const logoHeight = logoWidth * LOGO_ASPECT_RATIO
  const platePadding = 2.5
  const plateTop = 7
  const plateHeight = logoHeight + platePadding * 2
  const plateBottom = plateTop + plateHeight

  doc.setFont('times', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30, 31, 37)
  doc.text(company.companyName, marginX, plateTop + plateHeight / 2 + 1.8)
  doc.setFont('times', 'normal')

  try {
    const logoDataUrl = await loadImageAsDataUrl(LOGO_URL)
    const logoX = pageWidth - marginX - logoWidth
    const logoY = plateTop + platePadding
    // Placa navy detrás del logo para que el texto plateado resalte sobre
    // el fondo blanco del PDF (ver nota en pdfAssets.ts).
    doc.setFillColor(...LOGO_PLATE_COLOR)
    doc.roundedRect(logoX - platePadding, plateTop, logoWidth + platePadding * 2, plateHeight, 1.5, 1.5, 'F')
    doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight)
  } catch {
    // Si el logo no carga (ej. sin conexión al generar el PDF), seguimos sin
    // romper la descarga — el PDF sale sin logo pero con el resto del
    // encabezado.
  }

  let headerY = plateBottom + 4
  doc.setDrawColor(226, 232, 240)
  doc.line(marginX, headerY, pageWidth - marginX, headerY)

  headerY += 9
  doc.setFont('times', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(0, 0, 0)
  doc.text(employeeName ? `Planilla — ${employeeName}` : 'Planillas', marginX, headerY)
  doc.setFont('times', 'normal')

  if (periodLabel) {
    headerY += 6.5
    doc.setFontSize(10.5)
    doc.setTextColor(100, 100, 100)
    doc.text(`Período: ${periodLabel}`, marginX, headerY)
    doc.setTextColor(0, 0, 0)
  }

  autoTable(doc, {
    startY: headerY + 6,
    // Mismo ancho que la línea separadora del encabezado (marginX a cada lado).
    margin: { left: marginX, right: marginX },
    head: [head],
    body,
    styles: { fontSize: 9, cellPadding: 2.5, font: 'times' },
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

  const tableFinalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 20

  if (employeeOrder.length > 0) {
    const pageHeight = doc.internal.pageSize.getHeight()
    const boxPaddingX = 5
    const boxHeight = 14
    const boxGap = 6
    const hasGrandTotal = employeeOrder.length > 1
    // Alto del bloque completo de totales (una caja por empleado + "Total
    // general" si hay más de uno) — para poder pegarlo contra el final de
    // la hoja en vez de dejarlo pegado a la tabla.
    const blockHeight = employeeOrder.length * boxHeight + (employeeOrder.length - 1) * boxGap + (hasGrandTotal ? 10 : 0)
    const marginBottom = 14
    const minGapAfterTable = 18
    // Normalmente queda pegado al final de la hoja; si la tabla es tan
    // larga que no alcanza ese espacio, cae a un margen fijo debajo de la
    // tabla en vez de encimarse con ella.
    let finalY = Math.max(pageHeight - marginBottom - blockHeight, tableFinalY + minGapAfterTable)

    for (const employeeId of employeeOrder) {
      const label = `Total pagado: ${currency(totalsByEmployee.get(employeeId) ?? 0)}`
      doc.setFont('times', 'bold')
      doc.setFontSize(13)
      const boxWidth = doc.getTextWidth(label) + boxPaddingX * 2
      // Recuadro dorado alrededor del total — para que resalte cuánto se
      // pagó, en vez de perderse como una línea de texto más.
      doc.setFillColor(...GOLD_BG)
      doc.setDrawColor(...GOLD)
      doc.setLineWidth(0.4)
      doc.roundedRect(marginX, finalY, boxWidth, boxHeight, 2, 2, 'FD')
      doc.setTextColor(...GOLD_DARK)
      doc.text(label, marginX + boxPaddingX, finalY + boxHeight - 5)
      doc.setTextColor(0, 0, 0)
      doc.setFont('times', 'normal')
      finalY += boxHeight + boxGap
    }

    if (hasGrandTotal) {
      const grandTotal = Array.from(totalsByEmployee.values()).reduce((sum, v) => sum + v, 0)
      doc.setFont('times', 'bold')
      doc.setFontSize(12)
      doc.text(`Total general: ${currency(grandTotal)}`, marginX, finalY)
      doc.setFont('times', 'normal')
    }
  }

  doc.save(buildExportFilename(employeeName, 'pdf'))
}
