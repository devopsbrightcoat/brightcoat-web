import { FilterPanel } from '../common/FilterPanel'
import type { Employee, Property } from '../../types'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

// Filtros de la agenda del día en Horarios.tsx — por propiedad y por
// empleado. Los selects aplican de inmediato (mismo criterio que los
// filtros de Cobros), este panel (ver FilterPanel.tsx) solo los agrupa
// detrás de un botón para no ocupar espacio permanente en la página.
type ScheduleFiltersModalProps = {
  open: boolean
  onClose: () => void
  properties: Property[]
  employees: Employee[]
  propertyId: string
  employeeId: string
  onPropertyChange: (id: string) => void
  onEmployeeChange: (id: string) => void
}

export const ScheduleFiltersModal = ({
  open,
  onClose,
  properties,
  employees,
  propertyId,
  employeeId,
  onPropertyChange,
  onEmployeeChange,
}: ScheduleFiltersModalProps) => {
  const hasFilters = propertyId !== 'all' || employeeId !== 'all'

  return (
    <FilterPanel
      open={open}
      onClose={onClose}
      hasFilters={hasFilters}
      onClear={() => {
        onPropertyChange('all')
        onEmployeeChange('all')
      }}
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="sched-filter-property" className={labelClass}>
            Propiedad
          </label>
          <select
            id="sched-filter-property"
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
          <label htmlFor="sched-filter-employee" className={labelClass}>
            Empleado
          </label>
          <select
            id="sched-filter-employee"
            value={employeeId}
            onChange={(e) => onEmployeeChange(e.target.value)}
            className={inputClass}
          >
            <option value="all">Todos los empleados</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </FilterPanel>
  )
}
