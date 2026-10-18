import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { fetchCompanyInfoForPdf } from './companyInfo'
import { LOGO_ASPECT_RATIO, LOGO_PLATE_COLOR, LOGO_URL, loadImageAsDataUrl } from './pdfAssets'

export type EstimateLineItem = {
  name: string
  description: string
  qty: number
  rate: number
}

export type EstimateExportData = {
  estimateNumber: number
  date: string // ISO yyyy-mm-dd
  propertyName: string
  unitLabel?: string
  propertyContact?: string
  items: EstimateLineItem[]
  note?: string
  // Título que aparece arriba del PDF (ej. "Estimate" o "Invoice") y en las
  // etiquetas de número/fecha — por defecto "Estimate".
  documentTitle?: string
}

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const formatUsDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return `${m}/${d}/${y}`
}

const GOLD = [207, 145, 34] as const
const GOLD_BG = [253, 247, 231] as const
const INK = [30, 31, 37] as const
const GREY = [100, 100, 100] as const
const BORDER = [226, 232, 240] as const

export const exportEstimateToPdf = async (data: EstimateExportData): Promise<void> => {
  const { estimateNumber, date, propertyName, unitLabel, propertyContact, items, note } = data
  const title = data.documentTitle?.trim() || 'Estimate'
  const company = await fetchCompanyInfoForPdf()

  const doc = new jsPDF({ orientation: 'portrait', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 15
  const colWidth = 95

  // --- Encabezado: título + datos de la empresa a la izquierda, logo a la
  // derecha (mismo layout que los estimates que David ya conoce) ---
  doc.setFont('times', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...GOLD)
  doc.text(title.toUpperCase(), marginX, 20)

  doc.setFontSize(10)
  doc.setTextColor(...INK)
  const nameLines = doc.splitTextToSize(company.companyName, colWidth)
  doc.text(nameLines, marginX, 28)

  doc.setFont('times', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GREY)
  const addressY = 28 + nameLines.length * 4.6
  const addressLines = doc.splitTextToSize(company.address, colWidth)
  doc.text(addressLines, marginX, addressY)

  const col2X = marginX + colWidth
  doc.text(company.email, col2X, 28)
  doc.text(company.phone, col2X, 33)

  try {
    const logoDataUrl = await loadImageAsDataUrl(LOGO_URL)
    const logoWidth = 38
    const logoHeight = logoWidth * LOGO_ASPECT_RATIO
    const logoX = pageWidth - marginX - logoWidth
    // El logo queda centrado verticalmente contra el bloque de datos de la
    // empresa (nombre + dirección a la izquierda, email/teléfono a la
    // derecha) en vez de una posición fija, usando el alto real de lo que
    // se dibujó arriba.
    const infoTop = 28 - 7
    const addressBottom = addressY + Math.max(addressLines.length - 1, 0) * 4.6 + 3
    const phoneBottom = 33 + 3
    const infoBottom = Math.max(addressBottom, phoneBottom)
    const infoCenterY = (infoTop + infoBottom) / 2
    const platePadding = 3
    const logoY = infoCenterY - logoHeight / 2
    // Placa navy detrás del logo para que el texto plateado resalte sobre
    // el fondo blanco del PDF (ver nota en pdfAssets.ts).
    doc.setFillColor(...LOGO_PLATE_COLOR)
    doc.roundedRect(
      logoX - platePadding,
      logoY - platePadding,
      logoWidth + platePadding * 2,
      logoHeight + platePadding * 2,
      2,
      2,
      'F',
    )
    doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight)
  } catch {
    // Si el logo no carga, seguimos sin romper la descarga del estimado.
  }

  // --- Franja con el nombre de la propiedad/proyecto + datos del estimado ---
  const bandY = 50
  let bandHeight = 44
  if (unitLabel) bandHeight += 7
  if (propertyContact) bandHeight += 6
  doc.setFillColor(...GOLD_BG)
  doc.roundedRect(marginX, bandY, pageWidth - marginX * 2, bandHeight, 2, 2, 'F')

  let cursorY = bandY + 11
  doc.setFont('times', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...GOLD)
  doc.text(propertyName, marginX + 6, cursorY)

  if (unitLabel) {
    cursorY += 7
    doc.setFont('times', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...INK)
    doc.text(`Unit #: ${unitLabel}`, marginX + 6, cursorY)
  }

  if (propertyContact) {
    cursorY += 6
    doc.setFont('times', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...GREY)
    doc.text(propertyContact, marginX + 6, cursorY)
  }

  cursorY += 4
  doc.setDrawColor(...GOLD)
  doc.setLineDashPattern([0.6, 0.8], 0)
  doc.line(marginX + 6, cursorY, pageWidth - marginX - 6, cursorY)
  doc.setLineDashPattern([], 0)

  cursorY += 9
  doc.setFont('times', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...INK)
  doc.text(`${title} details`, marginX + 6, cursorY)

  cursorY += 6
  doc.setFont('times', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(60, 60, 60)
  doc.text(`${title} no.: ${estimateNumber}`, marginX + 6, cursorY)
  cursorY += 5.5
  doc.text(`${title} date: ${formatUsDate(date)}`, marginX + 6, cursorY)

  // --- Tabla de productos/servicios ---
  const head = ['#', 'Date', 'Product or service', 'Description', 'Qty', 'Rate', 'Amount']
  const body = items.map((item, idx) => [
    String(idx + 1),
    '',
    item.name,
    item.description,
    String(item.qty),
    currency(item.rate),
    currency(item.qty * item.rate),
  ])

  autoTable(doc, {
    startY: bandY + bandHeight + 10,
    // Mismo ancho que la franja de la propiedad (marginX a cada lado).
    margin: { left: marginX, right: marginX },
    head: [head],
    body,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, lineColor: [...BORDER], lineWidth: 0.2, textColor: 30, font: 'times' },
    headStyles: { fillColor: [...GOLD_BG], textColor: [120, 90, 20], fontStyle: 'bold', lineColor: [...BORDER] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 18 },
      2: { cellWidth: 38 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 12, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
    },
  })

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? bandY + bandHeight + 10
  const total = items.reduce((sum, item) => sum + item.qty * item.rate, 0)

  // Más despegado de la tabla que antes (no pegado contra la última fila).
  const totalY = finalY + 24
  doc.setDrawColor(...BORDER)
  doc.line(pageWidth - marginX - 70, totalY - 5, pageWidth - marginX, totalY - 5)
  doc.setFont('times', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...INK)
  doc.text('Total', pageWidth - marginX - 35, totalY, { align: 'right' })
  doc.setFontSize(14)
  doc.text(currency(total), pageWidth - marginX, totalY, { align: 'right' })

  // --- Nota para el cliente (igual que "Add note to customer" en
  // QuickBooks) — visible en el PDF, debajo del total ---
  if (note && note.trim()) {
    let noteY = totalY + 12
    doc.setFont('times', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...INK)
    doc.text('Note to customer', marginX, noteY)
    noteY += 5
    doc.setFont('times', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...GREY)
    const noteLines = doc.splitTextToSize(note.trim(), pageWidth - marginX * 2)
    doc.text(noteLines, marginX, noteY)
  }

  // --- Pie: líneas para aceptar el estimado ---
  const footerY = pageHeight - 35
  doc.setDrawColor(...BORDER)
  doc.line(marginX, footerY, marginX + 75, footerY)
  doc.line(marginX + 90, footerY, marginX + 165, footerY)
  doc.setFont('times', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GREY)
  doc.text('Accepted date', marginX, footerY + 5)
  doc.text('Accepted by', marginX + 90, footerY + 5)

  doc.setFontSize(8)
  doc.setTextColor(180, 180, 180)
  doc.text('1/1', pageWidth - marginX, pageHeight - 12, { align: 'right' })

  const dateSuffix = new Date().toISOString().slice(0, 10)
  doc.save(`${slugify(title)}-${estimateNumber}-${slugify(propertyName)}-${dateSuffix}.pdf`)
}
