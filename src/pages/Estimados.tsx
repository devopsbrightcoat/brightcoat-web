import { useState } from 'react'
import { FileDown, Plus, X } from 'lucide-react'
import { PageHeader } from '../components/common/PageHeader'
import { useReferenceData } from '../contexts/ReferenceDataContext'
import { getNextEstimateNumber } from '../lib/api'
import { exportEstimateToPdf, type EstimateLineItem } from '../lib/exportEstimate'
import { getErrorMessage } from '../lib/errors'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'
const sectionClass = 'mx-8 mt-6 max-w-3xl rounded-xl border border-white/10 bg-surface-alt p-6'
const sectionTitleClass = 'mb-4 text-sm font-semibold text-white'
const titleOptionClass = (active: boolean) =>
  `flex-1 rounded-lg border px-3.5 py-2.5 text-sm font-medium transition ${
    active ? 'border-gold-500 bg-gold-500/10 text-gold-400' : 'border-white/10 bg-surface text-ink-300 hover:bg-white/5'
  }`

type ItemLine = { key: number; name: string; description: string; qty: string; rate: string }

const emptyItem = (key: number): ItemLine => ({ key, name: '', description: '', qty: '1', rate: '' })

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

const todayISO = () => new Date().toISOString().slice(0, 10)

export const Estimados = () => {
  const { properties, loadingProperties } = useReferenceData()

  const [documentTitle, setDocumentTitle] = useState('Estimate')
  const [propertyId, setPropertyId] = useState('')
  const [unitLabel, setUnitLabel] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [items, setItems] = useState<ItemLine[]>([emptyItem(0)])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastGenerated, setLastGenerated] = useState<number | null>(null)

  const selectedProperty = (properties ?? []).find((p) => p.id === propertyId) ?? null

  const addItem = () => setItems((prev) => [...prev, emptyItem((prev.at(-1)?.key ?? 0) + 1)])
  const removeItem = (key: number) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev))

  const updateItem = (key: number, patch: Partial<ItemLine>) =>
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)))

  const parsedItems: EstimateLineItem[] = items
    .filter((item) => item.name.trim() || item.rate.trim())
    .map((item) => ({
      name: item.name.trim(),
      description: item.description.trim(),
      qty: Number(item.qty) || 0,
      rate: Number(item.rate) || 0,
    }))

  const total = parsedItems.reduce((sum, item) => sum + item.qty * item.rate, 0)

  const handleReset = () => {
    setDocumentTitle('Estimate')
    setPropertyId('')
    setUnitLabel('')
    setDate(todayISO())
    setNote('')
    setItems([emptyItem(0)])
    setLastGenerated(null)
    setError(null)
  }

  const handleGenerate = async () => {
    setError(null)
    if (!selectedProperty) {
      setError('Selecciona la propiedad para la que es el estimado.')
      return
    }
    if (parsedItems.length === 0) {
      setError('Agrega al menos un producto o servicio con su tarifa.')
      return
    }
    const invalidItem = parsedItems.find((item) => !item.name || item.qty <= 0 || item.rate < 0)
    if (invalidItem) {
      setError('Revisa que cada línea tenga nombre, cantidad mayor a 0 y una tarifa válida.')
      return
    }

    setGenerating(true)
    try {
      // El número se reserva justo al generar (no al abrir el formulario)
      // para no saltarse números si el formulario se abandona sin
      // descargar el PDF.
      const estimateNumber = await getNextEstimateNumber()
      await exportEstimateToPdf({
        estimateNumber,
        date,
        propertyName: selectedProperty.name,
        unitLabel: unitLabel.trim() || undefined,
        propertyContact: selectedProperty.managerContact,
        items: parsedItems,
        note: note.trim() || undefined,
        documentTitle: documentTitle.trim() || 'Estimate',
      })
      setLastGenerated(estimateNumber)
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo generar el estimado.'))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="h-screen overflow-y-auto pb-10">
      <PageHeader
        title="Estimados"
        subtitle="Arma un estimado para una propiedad y descárgalo en PDF para enviárselo al encargado"
      />

      <div className={sectionClass}>
        <p className={sectionTitleClass}>Título del documento</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDocumentTitle('Estimate')}
            className={titleOptionClass(documentTitle === 'Estimate')}
          >
            Estimate
          </button>
          <button
            type="button"
            onClick={() => setDocumentTitle('Invoice')}
            className={titleOptionClass(documentTitle === 'Invoice')}
          >
            Invoice
          </button>
        </div>
        <input
          value={documentTitle}
          onChange={(e) => setDocumentTitle(e.target.value)}
          placeholder="Estimate"
          className={`${inputClass} mt-3`}
        />
        <p className="mt-1.5 text-xs text-ink-500">
          Así aparece arriba del PDF — si no es Estimate ni Invoice, escribí el texto que quieras.
        </p>
      </div>

      <div className={sectionClass}>
        <p className={sectionTitleClass}>Propiedad</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="estimate-property" className={labelClass}>
              Propiedad
            </label>
            <select
              id="estimate-property"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className={inputClass}
              disabled={loadingProperties}
            >
              <option value="">Selecciona…</option>
              {(properties ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {selectedProperty?.managerContact && (
              <p className="mt-1.5 text-xs text-ink-500">Contacto: {selectedProperty.managerContact}</p>
            )}
          </div>

          <div>
            <label htmlFor="estimate-unit" className={labelClass}>
              Unidad (opcional)
            </label>
            <input
              id="estimate-unit"
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              placeholder="ej. L303"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="estimate-date" className={labelClass}>
              Fecha del estimado
            </label>
            <input
              id="estimate-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <div className="mb-2 flex items-center justify-between">
          <p className={sectionTitleClass}>Productos o servicios</p>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-ink-300 hover:bg-white/5"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar línea
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item) => {
            const qty = Number(item.qty) || 0
            const rate = Number(item.rate) || 0
            return (
              <div key={item.key} className="rounded-lg border border-white/10 bg-surface p-3.5">
                <div className="grid gap-2.5 sm:grid-cols-[1fr_6rem_8rem_auto] sm:items-start">
                  <input
                    value={item.name}
                    onChange={(e) => updateItem(item.key, { name: e.target.value })}
                    placeholder="Producto o servicio (ej. Baseboard Paint)"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={item.qty}
                    onChange={(e) => updateItem(item.key, { qty: e.target.value })}
                    placeholder="Qty"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.rate}
                    onChange={(e) => updateItem(item.key, { rate: e.target.value })}
                    placeholder="Tarifa"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.key)}
                    disabled={items.length === 1}
                    className="flex h-[42px] w-[42px] items-center justify-center rounded-lg border border-white/10 text-ink-400 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  value={item.description}
                  onChange={(e) => updateItem(item.key, { description: e.target.value })}
                  placeholder="Descripción (lo que ve el cliente en el PDF)"
                  rows={2}
                  className={`${inputClass} mt-2.5 resize-none`}
                />
                {qty > 0 && rate > 0 && (
                  <p className="mt-1.5 text-right text-xs text-ink-500">Monto: {currency(qty * rate)}</p>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex items-center justify-end border-t border-white/10 pt-4">
          <p className="text-sm font-semibold text-white">Total: {currency(total)}</p>
        </div>
      </div>

      <div className={sectionClass}>
        <label htmlFor="estimate-note" className={labelClass}>
          Nota para el cliente (opcional)
        </label>
        <p className="mb-2 text-xs text-ink-500">Aparece impresa en el PDF, debajo del total.</p>
        <textarea
          id="estimate-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="ej. Precio válido por 30 días. Incluye materiales y mano de obra."
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>

      {error && <p className="mx-8 mt-4 max-w-3xl text-sm text-red-400">{error}</p>}

      {lastGenerated && !error && (
        <p className="mx-8 mt-4 max-w-3xl text-sm text-emerald-400">
          {documentTitle.trim() || 'Estimate'} #{lastGenerated} descargado correctamente.
        </p>
      )}

      <div className="mx-8 mt-6 flex max-w-3xl items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-brand-900 transition hover:bg-gold-400 disabled:opacity-60"
        >
          <FileDown className="h-4 w-4" />
          {generating ? 'Generando…' : 'Generar PDF'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-ink-300 hover:bg-white/5"
        >
          Limpiar formulario
        </button>
      </div>
    </div>
  )
}
