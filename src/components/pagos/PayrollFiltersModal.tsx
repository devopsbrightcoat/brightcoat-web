import { FilterPanel } from '../common/FilterPanel'
import { QuincenaDateFilter } from '../dashboard/QuincenaDateFilter'
import type { Employee, Property } from '../../types'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm text-white outline-none focus:border-gold-500'
const labelClass = 'mb-1.5 block text-sm font-medium text-ink-200'

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

        <QuincenaDateFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={onDateFromChange}
          onDateToChange={onDateToChange}
          fromId="payroll-filter-date-from"
          toId="payroll-filter-date-to"
        />
      </div>
    </FilterPanel>
  )
}
