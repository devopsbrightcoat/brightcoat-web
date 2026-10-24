import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { getErrorMessage } from '../../lib/errors'
import { exportReportToExcel, exportReportToPdf } from '../../lib/exportReport'
import type { ReportExport } from '../../lib/reportExports'

type ExportFormat = 'pdf' | 'excel'

type ReportExportActionsProps = {
  buildReport: () => ReportExport
  disabled?: boolean
}

const buttonClass =
  'flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2 text-sm font-medium text-ink-300 hover:bg-white/5 disabled:opacity-60'

export const ReportExportActions = ({ buildReport, disabled = false }: ReportExportActionsProps) => {
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (format: ExportFormat) => {
    setExporting(format)
    setError(null)
    try {
      const report = buildReport()
      if (format === 'pdf') {
        await exportReportToPdf(report)
      } else {
        await exportReportToExcel(report)
      }
    } catch (err) {
      setError(getErrorMessage(err, format === 'pdf' ? 'No se pudo generar el PDF.' : 'No se pudo generar el Excel.'))
    } finally {
      setExporting(null)
    }
  }

  const isDisabled = disabled || exporting !== null

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <button type="button" disabled={isDisabled} onClick={() => handleExport('pdf')} className={buttonClass}>
          <FileText className="h-4 w-4" />
          {exporting === 'pdf' ? 'Generando…' : 'Exportar PDF'}
        </button>
        <button type="button" disabled={isDisabled} onClick={() => handleExport('excel')} className={buttonClass}>
          <Download className="h-4 w-4" />
          {exporting === 'excel' ? 'Generando…' : 'Exportar Excel'}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
