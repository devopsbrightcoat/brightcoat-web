import { FilterPanel } from './FilterPanel'
import type { Employee, Property } from '../types'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

// Filtros de Planillas — por propiedad, por empleado y por rango de fechas
// (con calendario, mismo criterio que ExpenseFiltersModal — desde/hasta en
// lugar de los presets de DateRangeSelect). Todos aplican de inmediato, este
// panel (ver FilterPanel.tsx) solo los agrupa detrás de un botón para no
// ocupar espacio permanente en la página. El searchbar
// (propiedad/unidad/empleado/servicio) vive aparte, directamente en
// Planillas.tsx.
type PayrollFiltersModalProps = {
  open: boolean
  onClose: () => void
  properties: Property[]
  employees: Employee[]
  propertyId: string
  employeeId: string
  dateFrom: string
  dateTo: string
  onPropertyChange: (id: string) => void
  onEmployeeChange: (id: string) => void
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
}

export const PayrollFiltersModal = ({
  open,
  onClose,
  properties,
  employees,
  propertyId,
  employeeId,
  dateFrom,
  dateTo,
  onPropertyChange,
  onEmployeeChange,
  onDateFromChange,
  onDateToChange,
}: PayrollFiltersModalProps) => {
  const hasFilters = propertyId !== 'all' || employeeId !== 'all' || Boolean(dateFrom) || Boolean(dateTo)

  return (
    <FilterPanel
      open={open}
      onClose={onClose}
      hasFilters={hasFilters}
      onClear={() => {
        onPropertyChange('all')
        onEmployeeChange('all')
        onDateFromChange('')
        onDateToChange('')
      }}
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="payroll-filter-property" className={labelClass}>
            Propiedad
          </label>
          <select
            id="payroll-filter-property"
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
          <label htmlFor="payroll-filter-employee" className={labelClass}>
            Empleado
          </label>
          <select
            id="payroll-filter-employee"
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="payroll-filter-date-from" className={labelClass}>
              Fecha desde
            </label>
            <input
              id="payroll-filter-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="payroll-filter-date-to" className={labelClass}>
              Fecha hasta
            </label>
            <input
              id="payroll-filter-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>
    </FilterPanel>
  )
}
