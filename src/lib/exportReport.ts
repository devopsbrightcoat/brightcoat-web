import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable, { type CellInput, type Styles } from 'jspdf-autotable'
import { fetchCompanyInfoForPdf } from './companyInfo'
import { LOGO_ASPECT_RATIO, LOGO_PLATE_COLOR, LOGO_URL, loadImageAsDataUrl } from './pdfAssets'
import {
  buildReportFilename,
  formatReportCell,
  isNumericFormat,
  type ReportCell,
  type ReportCellFormat,
  type ReportColumn,
  type ReportExport,
} from './reportExports'

const INK = [30, 31, 37] as const
const GOLD_BG = [253, 247, 231] as const
const GOLD_DARK = [120, 90, 20] as const
const MUTED = [110, 110, 110] as const

const EXCEL_NUM_FMT: Record<ReportCellFormat, string | undefined> = {
  text: undefined,
  currency: '$#,##0.00',
  percent: '0.0"%"',
  number: '0',
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const formatRow = (cells: ReportCell[], columns: ReportColumn[]) =>
  cells.map((cell, i) => formatReportCell(cell, columns[i]?.format))

const formatTotalsRow = (cells: ReportCell[], columns: ReportColumn[]) =>
  cells.map((cell, i) => (cell == null ? '' : formatReportCell(cell, columns[i]?.format)))

const alignedColumnStyles = (columns: ReportColumn[]) =>
  Object.fromEntries(
    columns.map((column, i): [number, Partial<Styles>] => [i, { halign: isNumericFormat(column.format) ? 'right' : 'left' }]),
  )

const lastTableY = (doc: jsPDF) => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 20

export const exportReportToPdf = async (report: ReportExport): Promise<void> => {
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 14
  const contentWidth = pageWidth - marginX * 2

  const company = await fetchCompanyInfoForPdf()
  const logoWidth = 26
  const logoHeight = logoWidth * LOGO_ASPECT_RATIO
  const platePadding = 2.5
  const plateTop = 7
  const plateHeight = logoHeight + platePadding * 2
  const plateBottom = plateTop + plateHeight

  doc.setFont('times', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...INK)
  doc.text(company.companyName, marginX, plateTop + plateHeight / 2 + 1.8)

  const logoDataUrl = await loadImageAsDataUrl(LOGO_URL).catch(() => null)
  if (logoDataUrl) {
    const logoX = pageWidth - marginX - logoWidth
    doc.setFillColor(...LOGO_PLATE_COLOR)
    doc.roundedRect(logoX - platePadding, plateTop, logoWidth + platePadding * 2, plateHeight, 1.5, 1.5, 'F')
    doc.addImage(logoDataUrl, 'PNG', logoX, plateTop + platePadding, logoWidth, logoHeight)
  }

  let cursorY = plateBottom + 4
  doc.setDrawColor(226, 232, 240)
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY)

  cursorY += 9
  doc.setFont('times', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(0, 0, 0)
  doc.text(report.title, marginX, cursorY)

  cursorY += 6.5
  doc.setFont('times', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(...MUTED)
  doc.text(`Período: ${report.periodLabel}`, marginX, cursorY)

  const baseStyles: Partial<Styles> = { font: 'times', fontSize: 9, cellPadding: 2.5, textColor: [...INK] }

  if (report.kpis.length > 0) {
    autoTable(doc, {
      startY: cursorY + 5,
      margin: { left: marginX, right: marginX },
      head: [report.kpis.map((kpi) => kpi.label)],
      body: [report.kpis.map((kpi) => formatReportCell(kpi.value, kpi.format))],
      theme: 'grid',
      styles: { ...baseStyles, halign: 'center', lineColor: [226, 232, 240] },
      headStyles: { fillColor: [...GOLD_BG], textColor: [...GOLD_DARK], fontStyle: 'bold' },
      bodyStyles: { fontStyle: 'bold', fontSize: 11 },
    })
    cursorY = lastTableY(doc)
  }

  for (const section of report.sections) {
    cursorY += 10
    if (cursorY > pageHeight - 35) {
      doc.addPage()
      cursorY = 18
    }

    doc.setFont('times', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text(section.title, marginX, cursorY)

    if (section.note) {
      doc.setFont('times', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...MUTED)
      const noteLines = doc.splitTextToSize(section.note, contentWidth) as string[]
      cursorY += 4.5
      doc.text(noteLines, marginX, cursorY)
      cursorY += (noteLines.length - 1) * 4
    }

    const body: CellInput[][] =
      section.rows.length > 0
        ? section.rows.map((row) => formatRow(row, section.columns))
        : [
            [
              {
                content: 'Sin datos en este período.',
                colSpan: section.columns.length,
                styles: { halign: 'center', textColor: [...MUTED] },
              },
            ],
          ]

    autoTable(doc, {
      startY: cursorY + 3,
      margin: { left: marginX, right: marginX },
      head: [section.columns.map((column) => column.header)],
      body,
      foot: section.totals && section.rows.length > 0 ? [formatTotalsRow(section.totals, section.columns)] : undefined,
      showFoot: 'lastPage',
      styles: baseStyles,
      headStyles: { fillColor: [...INK], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [...GOLD_BG], textColor: [...GOLD_DARK], fontStyle: 'bold' },
      columnStyles: alignedColumnStyles(section.columns),
      didParseCell: (data) => {
        if (data.section !== 'body' && isNumericFormat(section.columns[data.column.index]?.format)) {
          data.cell.styles.halign = 'right'
        }
      },
    })
    cursorY = lastTableY(doc)
  }

  doc.save(buildReportFilename(report, 'pdf'))
}

const toExcelValue = (value: ReportCell) => (value == null ? '' : value)

const buildSheetName = (title: string, used: Set<string>) => {
  const base = title.replace(/[\\/?*[\]:]/g, '').slice(0, 31).trim() || 'Hoja'
  let name = base
  let suffix = 2
  while (used.has(name)) {
    name = `${base.slice(0, 28)} ${suffix}`
    suffix += 1
  }
  used.add(name)
  return name
}

export const exportReportToExcel = async (report: ReportExport): Promise<void> => {
  const workbook = new ExcelJS.Workbook()
  const usedNames = new Set<string>()

  const summary = workbook.addWorksheet(buildSheetName('Resumen', usedNames))
  summary.columns = [{ width: 34 }, { width: 20 }]
  summary.addRow([report.title]).font = { bold: true, size: 14 }
  summary.addRow([`Período: ${report.periodLabel}`])
  summary.addRow([])
  for (const kpi of report.kpis) {
    const row = summary.addRow([kpi.label, toExcelValue(kpi.value)])
    row.getCell(1).font = { bold: true }
    const numFmt = EXCEL_NUM_FMT[kpi.format ?? 'text']
    if (numFmt) row.getCell(2).numFmt = numFmt
  }

  for (const section of report.sections) {
    const sheet = workbook.addWorksheet(buildSheetName(section.title, usedNames))
    sheet.columns = section.columns.map((column) => ({
      header: column.header,
      width: Math.max(14, Math.round((column.weight ?? 1) * 16)),
    }))
    sheet.getRow(1).font = { bold: true }
    section.columns.forEach((column, i) => {
      const numFmt = EXCEL_NUM_FMT[column.format ?? 'text']
      if (numFmt) sheet.getColumn(i + 1).numFmt = numFmt
    })

    for (const row of section.rows) sheet.addRow(row.map(toExcelValue))

    if (section.totals && section.rows.length > 0) {
      const totalsRow = sheet.addRow(section.totals.map(toExcelValue))
      totalsRow.font = { bold: true }
      totalsRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = { top: { style: 'thin', color: { argb: 'FF94A3B8' } } }
      })
    }

    if (section.note) {
      sheet.addRow([])
      sheet.addRow([section.note]).font = { italic: true, color: { argb: 'FF64748B' } }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  downloadBlob(blob, buildReportFilename(report, 'xlsx'))
}
