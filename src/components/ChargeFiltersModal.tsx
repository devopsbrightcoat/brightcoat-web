import { FilterPanel } from './FilterPanel'
import type { Property, ServiceType } from '../types'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

// Filtros de la tabla de Cobros — por propiedad, estatus y tipo de
// servicio. Aplican de inmediato (mismo criterio que
// ScheduleFiltersModal/ExpenseFiltersModal), este panel (ver FilterPanel.tsx
// — el "chrome" común, deslizable desde la derecha, que ahora comparten los
// filtros de las cuatro pantallas) solo agrupa los campos detrás de un
// botón para no ocupar espacio permanente en la página. El searchbar
// (propiedad/apartamento/descripción/invoice #) vive aparte, directamente
// en Cobros.tsx.
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
    <FilterPanel
      open={open}
      onClose={onClose}
      hasFilters={hasFilters}
      onClear={() => {
        onPropertyChange('all')
        onStatusChange('all')
        onServiceTypeChange('all')
      }}
    >
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
      </div>
    </FilterPanel>
  )
}
