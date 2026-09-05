import { useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, RotateCcw, Upload, XCircle } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import {
  importValidatedRows,
  parseServicesWorkbook,
  validateRow,
  type ImportOutcome,
  type ValidatedRow,
} from '../lib/importServices'

type Stage = 'idle' | 'parsed' | 'importing' | 'done'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const Importar = () => {
  const [stage, setStage] = useState<Stage>('idle')
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [rows, setRows] = useState<ValidatedRow[]>([])
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [outcomes, setOutcomes] = useState<ImportOutcome[]>([])
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const validRows = rows.filter((r) => r.errors.length === 0)
  const invalidCount = rows.length - validRows.length

  const handleFile = async (file: File) => {
    setFileName(file.name)
    setParseError(null)
    setOutcomes([])

    try {
      const parsed = await parseServicesWorkbook(file)
      if (parsed.length === 0) {
        setParseError('No se encontraron filas con datos en la hoja "Servicios".')
        setRows([])
        setStage('idle')
        return
      }
      setRows(parsed.map(validateRow))
      setStage('parsed')
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'No se pudo leer el archivo.')
      setRows([])
      setStage('idle')
    }
  }

  const handleImport = async () => {
    setStage('importing')
    setProgress({ done: 0, total: validRows.length })
    const result = await importValidatedRows(validRows, (done, total) => setProgress({ done, total }))
    setOutcomes(result)
    setStage('done')
  }

  const reset = () => {
    setStage('idle')
    setFileName('')
    setParseError(null)
    setRows([])
    setOutcomes([])
    if (inputRef.current) inputRef.current.value = ''
  }

  const successCount = outcomes.filter((o) => o.success).length
  const failureCount = outcomes.length - successCount

  return (
    <div className="pb-10">
      <PageHeader
        title="Importar Excel"
        subtitle="Sube la plantilla de servicios y cobros"
        action={
          <a
            href="/plantilla-servicios.xlsx"
            download
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-alt px-3.5 py-2 text-sm font-medium text-ink-300 hover:bg-white/5"
          >
            <Download className="h-4 w-4" />
            Descargar plantilla
          </a>
        }
      />

      {stage === 'idle' && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) void handleFile(file)
          }}
          className={`mx-8 mt-6 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition ${
            dragOver ? 'border-gold-500 bg-gold-500/5' : 'border-white/15 bg-surface-alt'
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
            <Upload className="h-5 w-5 text-ink-400" />
          </span>
          <p className="text-sm font-medium text-ink-200">Arrastra tu archivo aquí, o haz clic para elegirlo</p>
          <p className="text-xs text-ink-500">Plantilla "Servicios" en formato .xlsx</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-2 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-400"
          >
            Elegir archivo
          </button>
          {parseError && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4" /> {parseError}
            </p>
          )}
        </div>
      )}

      {stage !== 'idle' && (
        <>
          <div className="mx-8 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-surface-alt px-5 py-3.5">
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
            <div className="mx-8 mt-4">
              <button
                type="button"
                disabled={validRows.length === 0}
                onClick={handleImport}
                className="rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-brand-900 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Importar {validRows.length} {validRows.length === 1 ? 'fila válida' : 'filas válidas'}
              </button>
            </div>
          )}

          {stage === 'importing' && (
            <p className="mx-8 mt-4 text-sm text-ink-400">
              Importando… {progress.done} / {progress.total}
            </p>
          )}

          {stage === 'done' && (
            <div className="mx-8 mt-4 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> {successCount} importados
              </span>
              {failureCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-400">
                  <XCircle className="h-4 w-4" /> {failureCount} con error
                </span>
              )}
            </div>
          )}

          <div className="mx-8 mt-4 overflow-x-auto rounded-xl border border-white/10 bg-surface-alt">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-5 py-3 font-medium">Pestaña</th>
                  <th className="px-5 py-3 font-medium">Propiedad</th>
                  <th className="px-5 py-3 font-medium">Servicio</th>
                  <th className="px-5 py-3 font-medium">Costo</th>
                  <th className="px-5 py-3 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const outcome = outcomes.find((o) => o.sheetName === row.sheetName && o.rowNumber === row.rowNumber)
                  return (
                    <tr key={`${row.sheetName}-${row.rowNumber}`} className="border-b border-white/5 last:border-0">
                      <td className="px-5 py-3 text-ink-500">
                        {row.sheetName} · fila {row.rowNumber}
                      </td>
                      <td className="px-5 py-3 text-ink-200">{row.propertyName || '—'}</td>
                      <td className="px-5 py-3 text-ink-400">{row.serviceTypeName || '—'}</td>
                      <td className="px-5 py-3 tabular-nums text-ink-400">
                        {Number.isNaN(row.cost) ? '—' : currency(row.cost)}
                      </td>
                      <td className="px-5 py-3">
                        {outcome ? (
                          outcome.success ? (
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
    </div>
  )
}
