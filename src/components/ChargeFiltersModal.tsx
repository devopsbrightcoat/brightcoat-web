import { Modal } from './Modal'
import type { Property, ServiceType } from '../types'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

// Filtros de la tabla de Cobros — por propiedad, estatus y tipo de
// servicio. Aplican de inmediato (mismo criterio que
// ScheduleFiltersModal/ExpenseFiltersModal), este modal solo los agrupa
// detrás de un botón para no ocupar espacio permanente en la página. El
// searchbar (propiedad/apartamento/descripción/invoice #) vive aparte,
// directamente en Cobros.tsx.
type ChargeFiltersModalProps = {
  open: boolean
  onClose: () => void
  properties: Property[]
  serviceTypes: ServiceType[]
  propertyId: string
  status: 'all' | 'paid' | 'pending'
  serviceTypeId: string
  onPropertyChange: (id: string) => void
  onStatusChange: (status: 'all' | 'paid' | 'pending') => void
  onServiceTypeChange: (id: string) => void
}

export const ChargeFiltersModal = ({
  open,
  onClose,
  properties,
  serviceTypes,
  propertyId,
  status,
  serviceTypeId,
  onPropertyChange,
  onStatusChange,
  onServiceTypeChange,
}: ChargeFiltersModalProps) => {
  const hasFilters = propertyId !== 'all' || status !== 'all' || serviceTypeId !== 'all'

  return (
    <Modal open={open} onClose={onClose} title="Filtros">
      <div className="space-y-4">
        <div>
          <label htmlFor="chg-filter-property" className={labelClass}>
            Propiedad
          </label>
          <select
            id="chg-filter-property"
            value={propertyId}
            onChange={(e) => onPropertyChange(e.target.value)}
            className={inputClass}
          >
            <option value="all">Todas las propiedades</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="chg-filter-status" className={labelClass}>
            Estatus
          </label>
          <select
            id="chg-filter-status"
            value={status}
            onChange={(e) => onStatusChange(e.target.value as typeof status)}
            className={inputClass}
          >
            <option value="all">Todos los estatus</option>
            <option value="paid">Subidos a OPS</option>
            <option value="pending">Pendientes</option>
          </select>
        </div>

        <div>
          <label htmlFor="chg-filter-service-type" className={labelClass}>
            Tipo de servicio
          </label>
          <select
            id="chg-filter-service-type"
            value={serviceTypeId}
            onChange={(e) => onServiceTypeChange(e.target.value)}
            className={inputClass}
          >
            <option value="all">Todos los servicios</option>
            {serviceTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            disabled={!hasFilters}
            onClick={() => {
              onPropertyChange('all')
              onStatusChange('all')
              onServiceTypeChange('all')
            }}
            className="text-sm font-medium text-ink-400 hover:text-ink-200 disabled:opacity-40 disabled:hover:text-ink-400"
          >
            Limpiar filtros
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-400"
          >
            Aplicar
          </button>
        </div>
      </div>
    </Modal>
  )
}
