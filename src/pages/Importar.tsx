import { useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, RotateCcw, Upload, XCircle } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import {
  importValidatedChargeRows,
  parseChargesWorkbook,
  validateChargeRow,
  type ImportChargeOutcome,
  type ValidatedChargeRow,
} from '../lib/importCobros'
import {
  importValidatedExpenseRows,
  parseExpensesWorkbook,
  validateExpenseRow,
  type ImportExpenseOutcome,
  type ValidatedExpenseRow,
} from '../lib/importExpenses'

type Stage = 'idle' | 'parsed' | 'importing' | 'done'
type Kind = 'gastos' | 'cobros'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const categoryLabels: Record<string, string> = {
  materials: 'Materiales',
  labor: 'Mano de obra',
  transport: 'Transporte',
  tools: 'Herramientas',
  other: 'Otro',
}

const TABS: { key: Kind; label: string }[] = [
  { key: 'cobros', label: 'Cobros' },
  { key: 'gastos', label: 'Gastos' },
]

export const Importar = () => {
  const [kind, setKind] = useState<Kind>('cobros')

  // -- Gastos -------------------------------------------------------------
  const [expStage, setExpStage] = useState<Stage>('idle')
  const [expFileName, setExpFileName] = useState('')
  const [expParseError, setExpParseError] = useState<string | null>(null)
  const [expRows, setExpRows] = useState<ValidatedExpenseRow[]>([])
  const [expProgress, setExpProgress] = useState({ done: 0, total: 0 })
  const [expOutcomes, setExpOutcomes] = useState<ImportExpenseOutcome[]>([])
  const [expDragOver, setExpDragOver] = useState(false)
  const expInputRef = useRef<HTMLInputElement>(null)

  // -- Cobros ---------------------------------------------------------------
  const [chgStage, setChgStage] = useState<Stage>('idle')
  const [chgFileName, setChgFileName] = useState('')
  const [chgParseError, setChgParseError] = useState<string | null>(null)
  const [chgRows, setChgRows] = useState<ValidatedChargeRow[]>([])
  const [chgProgress, setChgProgress] = useState({ done: 0, total: 0 })
  const [chgOutcomes, setChgOutcomes] = useState<ImportChargeOutcome[]>([])
  const [chgDragOver, setChgDragOver] = useState(false)
  const chgInputRef = useRef<HTMLInputElement>(null)

  const expValidRows = expRows.filter((r) => r.errors.length === 0)
  const expInvalidCount = expRows.length - expValidRows.length
  const expSuccessCount = expOutcomes.filter((o) => o.success && !o.skipped).length
  const expSkippedCount = expOutcomes.filter((o) => o.skipped).length
  const expFailureCount = expOutcomes.filter((o) => !o.success).length

  const chgValidRows = chgRows.filter((r) => r.errors.length === 0)
  const chgInvalidCount = chgRows.length - chgValidRows.length
  const chgSuccessCount = chgOutcomes.filter((o) => o.success && !o.skipped).length
  const chgSkippedCount = chgOutcomes.filter((o) => o.skipped).length
  const chgFailureCount = chgOutcomes.filter((o) => !o.success).length

  const handleExpenseFile = async (file: File) => {
    setExpFileName(file.name)
    setExpParseError(null)
    setExpOutcomes([])

    try {
      const parsed = await parseExpensesWorkbook(file)
      if (parsed.length === 0) {
        setExpParseError('No se encontraron filas con datos en la hoja "Gastos".')
        setExpRows([])
        setExpStage('idle')
        return
      }
      setExpRows(parsed.map(validateExpenseRow))
      setExpStage('parsed')
    } catch (err) {
      setExpParseError(err instanceof Error ? err.message : 'No se pudo leer el archivo.')
      setExpRows([])
      setExpStage('idle')
    }
  }

  const handleExpenseImport = async () => {
    setExpStage('importing')
    setExpProgress({ done: 0, total: expValidRows.length })
    const result = await importValidatedExpenseRows(expValidRows, (done, total) => setExpProgress({ done, total }))
    setExpOutcomes(result)
    setExpStage('done')
  }

  const resetExpenses = () => {
    setExpStage('idle')
    setExpFileName('')
    setExpParseError(null)
    setExpRows([])
    setExpOutcomes([])
    if (expInputRef.current) expInputRef.current.value = ''
  }

  const handleChargeFile = async (file: File) => {
    setChgFileName(file.name)
    setChgParseError(null)
    setChgOutcomes([])

    try {
      const parsed = await parseChargesWorkbook(file)
      if (parsed.length === 0) {
        setChgParseError('No se encontraron filas con datos en la hoja "Cobros".')
        setChgRows([])
        setChgStage('idle')
        return
      }
      setChgRows(parsed.map(validateChargeRow))
      setChgStage('parsed')
    } catch (err) {
      setChgParseError(err instanceof Error ? err.message : 'No se pudo leer el archivo.')
      setChgRows([])
      setChgStage('idle')
    }
  }

  const handleChargeImport = async () => {
    setChgStage('importing')
    setChgProgress({ done: 0, total: chgValidRows.length })
    const result = await importValidatedChargeRows(chgValidRows, (done, total) => setChgProgress({ done, total }))
    setChgOutcomes(result)
    setChgStage('done')
  }

  const resetCharges = () => {
    setChgStage('idle')
    setChgFileName('')
    setChgParseError(null)
    setChgRows([])
    setChgOutcomes([])
    if (chgInputRef.current) chgInputRef.current.value = ''
  }

  const stage = kind === 'gastos' ? expStage : chgStage
  const fileName = kind === 'gastos' ? expFileName : chgFileName
  const parseError = kind === 'gastos' ? expParseError : chgParseError
  const dragOver = kind === 'gastos' ? expDragOver : chgDragOver
  const setDragOver = kind === 'gastos' ? setExpDragOver : setChgDragOver
  const inputRef = kind === 'gastos' ? expInputRef : chgInputRef
  const handleFile = kind === 'gastos' ? handleExpenseFile : handleChargeFile
  const templateHref = kind === 'gastos' ? '/plantilla-gastos.xlsx' : '/plantilla-cobros.xlsx'
  const acceptHint = kind === 'gastos' ? 'Plantilla "Gastos" en formato .xlsx' : 'Plantilla "Cobros" en formato .xlsx'

  return (
    <div className="pb-10">
      <PageHeader
        title="Importar Excel"
        subtitle={
          kind === 'gastos' ? 'Sube la plantilla de gastos y planillas' : 'Sube la plantilla de cobros por apartamento'
        }
        action={
          <a
            href={templateHref}
            download
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-alt px-3.5 py-2 text-sm font-medium text-ink-300 hover:bg-white/5"
          >
            <Download className="h-4 w-4" />
            Descargar plantilla
          </a>
        }
      />

      <div className="mx-8 mt-6 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setKind(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              kind === tab.key
                ? 'bg-gold-500 text-brand-900'
                : 'border border-white/10 bg-surface-alt text-ink-300 hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
          <p className="text-xs text-ink-500">{acceptHint}</p>
          <p className="max-w-md text-xs text-ink-500">
            Puedes subir el mismo archivo más de una vez sin duplicar datos — las filas que ya se hayan importado
            antes se detectan automáticamente y se omiten.
          </p>
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

      {kind === 'gastos' && stage !== 'idle' && (
        <>
          <div className="mx-8 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-surface-alt px-5 py-3.5">
            <div className="flex items-center gap-2 text-sm text-ink-200">
              <FileSpreadsheet className="h-4 w-4 text-ink-500" />
              {fileName} · {expRows.length} filas · {expValidRows.length} válidas
              {expInvalidCount > 0 && <span className="text-red-400">, {expInvalidCount} con error</span>}
            </div>
            {expStage !== 'importing' && (
              <button
                type="button"
                onClick={resetExpenses}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-ink-300 hover:bg-white/5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Cargar otro archivo
              </button>
            )}
          </div>

          {expStage === 'parsed' && (
            <div className="mx-8 mt-4">
              <button
                type="button"
                disabled={expValidRows.length === 0}
                onClick={handleExpenseImport}
                className="rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-brand-900 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Importar {expValidRows.length} {expValidRows.length === 1 ? 'fila válida' : 'filas válidas'}
              </button>
            </div>
          )}

          {expStage === 'importing' && (
            <p className="mx-8 mt-4 text-sm text-ink-400">
              Importando… {expProgress.done} / {expProgress.total}
            </p>
          )}

          {expStage === 'done' && (
            <div className="mx-8 mt-4 flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> {expSuccessCount} importados
              </span>
              {expSkippedCount > 0 && (
                <span className="flex items-center gap-1.5 text-amber-400">
                  <AlertTriangle className="h-4 w-4" /> {expSkippedCount} ya estaban importados (omitidos)
                </span>
              )}
              {expFailureCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-400">
                  <XCircle className="h-4 w-4" /> {expFailureCount} con error
                </span>
              )}
            </div>
          )}

          <div className="mx-8 mt-4 overflow-x-auto rounded-xl border border-white/10 bg-surface-alt">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-5 py-3 font-medium">Fila</th>
                  <th className="px-5 py-3 font-medium">Propiedad</th>
                  <th className="px-5 py-3 font-medium">Categoría</th>
                  <th className="px-5 py-3 font-medium">Monto</th>
                  <th className="px-5 py-3 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {expRows.map((row) => {
                  const outcome = expOutcomes.find((o) => o.rowNumber === row.rowNumber)
                  return (
                    <tr key={row.rowNumber} className="border-b border-white/5 last:border-0">
                      <td className="px-5 py-3 text-ink-500">fila {row.rowNumber}</td>
                      <td className="px-5 py-3 text-ink-200">{row.propertyName || 'Gasto general'}</td>
                      <td className="px-5 py-3 text-ink-400">{categoryLabels[row.category] ?? row.category}</td>
                      <td className="px-5 py-3 tabular-nums text-ink-400">
                        {Number.isNaN(row.amount) ? '—' : currency(row.amount)}
                      </td>
                      <td className="px-5 py-3">
                        {outcome ? (
                          outcome.skipped ? (
                            <span className="flex items-start gap-1.5 text-amber-400">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Ya estaba importado
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

      {kind === 'cobros' && stage !== 'idle' && (
        <>
          <div className="mx-8 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-surface-alt px-5 py-3.5">
            <div className="flex items-center gap-2 text-sm text-ink-200">
              <FileSpreadsheet className="h-4 w-4 text-ink-500" />
              {fileName} · {chgRows.length} filas · {chgValidRows.length} válidas
              {chgInvalidCount > 0 && <span className="text-red-400">, {chgInvalidCount} con error</span>}
            </div>
            {chgStage !== 'importing' && (
              <button
                type="button"
                onClick={resetCharges}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-ink-300 hover:bg-white/5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Cargar otro archivo
              </button>
            )}
          </div>

          {chgStage === 'parsed' && (
            <div className="mx-8 mt-4">
              <button
                type="button"
                disabled={chgValidRows.length === 0}
                onClick={handleChargeImport}
                className="rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-brand-900 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Importar {chgValidRows.length} {chgValidRows.length === 1 ? 'fila válida' : 'filas válidas'}
              </button>
            </div>
          )}

          {chgStage === 'importing' && (
            <p className="mx-8 mt-4 text-sm text-ink-400">
              Importando… {chgProgress.done} / {chgProgress.total}
            </p>
          )}

          {chgStage === 'done' && (
            <div className="mx-8 mt-4 flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> {chgSuccessCount} importados
              </span>
              {chgSkippedCount > 0 && (
                <span className="flex items-center gap-1.5 text-amber-400">
                  <AlertTriangle className="h-4 w-4" /> {chgSkippedCount} ya estaban importados (omitidos)
                </span>
              )}
              {chgFailureCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-400">
                  <XCircle className="h-4 w-4" /> {chgFailureCount} con error
                </span>
              )}
            </div>
          )}

          <div className="mx-8 mt-4 overflow-x-auto rounded-xl border border-white/10 bg-surface-alt">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-5 py-3 font-medium">Pestaña</th>
                  <th className="px-5 py-3 font-medium">Tabla</th>
                  <th className="px-5 py-3 font-medium">Apartamento</th>
                  <th className="px-5 py-3 font-medium">Descripción</th>
                  <th className="px-5 py-3 font-medium">Monto</th>
                  <th className="px-5 py-3 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {chgRows.map((row) => {
                  const outcome = chgOutcomes.find(
                    (o) => o.sheetName === row.sheetName && o.rowNumber === row.rowNumber && o.side === row.side,
                  )
                  return (
                    <tr key={`${row.sheetName}-${row.rowNumber}-${row.side}`} className="border-b border-white/5 last:border-0">
                      <td className="px-5 py-3 text-ink-500">
                        {row.sheetName} · fila {row.rowNumber}
                      </td>
                      <td className="px-5 py-3 text-ink-400">
                        {row.status === 'paid' ? 'Subido a OPS' : 'Pendiente'}
                      </td>
                      <td className="px-5 py-3 text-ink-200">{row.unitLabel || '—'}</td>
                      <td className="px-5 py-3 text-ink-400">{row.description || '—'}</td>
                      <td className="px-5 py-3 tabular-nums text-ink-400">
                        {Number.isNaN(row.amount) ? '—' : currency(row.amount)}
                      </td>
                      <td className="px-5 py-3">
                        {outcome ? (
                          outcome.skipped ? (
                            <span className="flex items-start gap-1.5 text-amber-400">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Ya estaba importado
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
    </div>
  )
}
