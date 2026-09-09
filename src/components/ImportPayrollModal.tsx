import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, RotateCcw, XCircle } from 'lucide-react'
import { Modal } from './Modal'
import { ImportDropzone } from './ImportDropzone'
import { getErrorMessage } from '../lib/errors'
import {
  importValidatedPayrollRows,
  parsePayrollWorkbook,
  validatePayrollRow,
  type ImportPayrollOutcome,
  type ValidatedPayrollRow,
} from '../lib/importPayroll'

type Stage = 'idle' | 'parsed' | 'importing' | 'done'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

type ImportPayrollModalProps = {
  open: boolean
  onClose: () => void
  onImported: () => void
}

export const ImportPayrollModal = ({ open, onClose, onImported }: ImportPayrollModalProps) => {
  const [stage, setStage] = useState<Stage>('idle')
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [rows, setRows] = useState<ValidatedPayrollRow[]>([])
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [outcomes, setOutcomes] = useState<ImportPayrollOutcome[]>([])

  const validRows = rows.filter((r) => r.errors.length === 0)
  const invalidCount = rows.length - validRows.length
  const successCount = outcomes.filter((o) => o.success && !o.skipped).length
  const skippedCount = outcomes.filter((o) => o.skipped).length
  const failureCount = outcomes.filter((o) => !o.success).length

  const reset = () => {
    setStage('idle')
    setFileName('')
    setParseError(null)
    setRows([])
    setOutcomes([])
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFile = async (file: File) => {
    setFileName(file.name)
    setParseError(null)
    setOutcomes([])
    try {
      const parsed = await parsePayrollWorkbook(file)
      if (parsed.length === 0) {
        setParseError('No se encontraron filas con datos en la hoja "Planillas".')
        setRows([])
        setStage('idle')
        return
      }
      setRows(parsed.map(validatePayrollRow))
      setStage('parsed')
    } catch (err) {
      setParseError(getErrorMessage(err, 'No se pudo leer el archivo.'))
      setRows([])
      setStage('idle')
    }
  }

  const handleImport = async () => {
    setStage('importing')
    setProgress({ done: 0, total: validRows.length })
    const result = await importValidatedPayrollRows(validRows, (done, total) => setProgress({ done, total }))
    setOutcomes(result)
    setStage('done')
    onImported()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Cargar Excel de planillas" widthClassName="max-w-3xl">
      <div className="space-y-4">
        <a
          href="/plantilla-planillas.xlsx"
          download
          className="flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-surface px-3.5 py-2 text-sm font-medium text-ink-300 hover:bg-white/5"
        >
          <Download className="h-4 w-4" />
          Descargar plantilla
        </a>

        {stage === 'idle' && (
          <ImportDropzone
            onFile={handleFile}
            parseError={parseError}
            acceptHint='Plantilla "Planillas" en formato .xlsx (propiedad, empleado, monto, fecha y descripción)'
          />
        )}

        {stage !== 'idle' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-surface px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-ink-200">
                <FileSpreadsheet className="h-4 w-4 text-ink-500" />
                {fileName} · {rows.length} filas · {validRows.length} válidas
                {invalidCount > 0 && <span className="text-red-400">, {invalidCount} con error</span>}
              </div>
              {stage !== 'importing' && (
                <button
                  type="button"
                  onClick={reset}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-ink-300 hover:bg-white/5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Cargar otro archivo
                </button>
              )}
            </div>

            {stage === 'parsed' && (
              <button
                type="button"
                disabled={validRows.length === 0}
                onClick={handleImport}
                className="rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-brand-900 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Importar {validRows.length} {validRows.length === 1 ? 'fila válida' : 'filas válidas'}
              </button>
            )}

            {stage === 'importing' && (
              <p className="text-sm text-ink-400">
                Importando… {progress.done} / {progress.total}
              </p>
            )}

            {stage === 'done' && (
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> {successCount} importados
                </span>
                {skippedCount > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <AlertTriangle className="h-4 w-4" /> {skippedCount} ya estaban importados (omitidos)
                  </span>
                )}
                {failureCount > 0 && (
                  <span className="flex items-center gap-1.5 text-red-400">
                    <XCircle className="h-4 w-4" /> {failureCount} con error
                  </span>
                )}
              </div>
            )}

            <div className="max-h-80 overflow-auto rounded-xl border border-white/10 bg-surface">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-ink-500">
                    <th className="px-4 py-2.5 font-medium">Fila</th>
                    <th className="px-4 py-2.5 font-medium">Empleado</th>
                    <th className="px-4 py-2.5 font-medium">Monto</th>
                    <th className="px-4 py-2.5 font-medium">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const outcome = outcomes.find((o) => o.rowNumber === row.rowNumber)
                    return (
                      <tr key={row.rowNumber} className="border-b border-white/5 last:border-0">
                        <td className="px-4 py-2.5 text-ink-500">fila {row.rowNumber}</td>
                        <td className="px-4 py-2.5 text-ink-200">{row.employeeName || '—'}</td>
                        <td className="px-4 py-2.5 tabular-nums text-ink-400">
                          {Number.isNaN(row.amount) ? '—' : currency(row.amount)}
                        </td>
                        <td className="px-4 py-2.5">
                          {outcome ? (
                            outcome.skipped ? (
                              <span className="flex items-start gap-1.5 text-amber-400">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Ya importado
                              </span>
                            ) : outcome.success ? (
                              <span className="flex items-center gap-1.5 text-emerald-400">
                                <CheckCircle2 className="h-4 w-4 shrink-0" /> Importado
                              </span>
                            ) : (
                              <span className="flex items-start gap-1.5 text-red-400">
                                <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {outcome.message}
                              </span>
                            )
                          ) : row.errors.length > 0 ? (
                            <span className="flex items-start gap-1.5 text-red-400">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                              <span>{row.errors.join(' ')}</span>
                            </span>
                          ) : (
                            <span className="text-ink-500">Lista para importar</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-ink-300 hover:bg-white/5"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  )
}
