import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Filter, Pencil, Plus } from 'lucide-react'
import { PageHeader } from '../components/common/PageHeader'
import { StatusPill } from '../components/common/StatusPill'
import { AddScheduleModal } from '../components/horarios/AddScheduleModal'
import { EditScheduleModal } from '../components/horarios/EditScheduleModal'
import { ScheduleActionModal } from '../components/horarios/ScheduleActionModal'
import { ScheduleDetailModal } from '../components/horarios/ScheduleDetailModal'
import { ScheduleFiltersModal } from '../components/horarios/ScheduleFiltersModal'
import { fetchEmployees, fetchProperties, fetchSchedules, fetchServiceTypes } from '../lib/api'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import { exportSchedulesToExcel } from '../lib/exportSchedules'
import { getErrorMessage } from '../lib/errors'
import {
  DAY_LABELS,
  addDays,
  formatMonthLabel,
  formatWeekLabel,
  getWeeksInMonth,
  parseISODate,
  pickDateWithinWeek,
  pickWeekContaining,
  toISODate,
  type WeekRange,
} from '../lib/scheduleDates'
import type { Schedule } from '../types'

const today = new Date()

export const Horarios = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: schedules, loading, error } = useSupabaseQuery(fetchSchedules, [refreshKey])
  const { data: properties } = useSupabaseQuery(fetchProperties, [])
  const { data: serviceTypes } = useSupabaseQuery(fetchServiceTypes, [])
  const { data: employees } = useSupabaseQuery(fetchEmployees, [])

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const weeks = useMemo(() => getWeeksInMonth(viewYear, viewMonth), [viewYear, viewMonth])

  const [selectedWeek, setSelectedWeek] = useState<WeekRange>(() => pickWeekContaining(weeks, today))
  const [selectedDateIso, setSelectedDateIso] = useState(() => toISODate(pickDateWithinWeek(selectedWeek, today)))

  const [addOpen, setAddOpen] = useState(false)
  const [actionSchedule, setActionSchedule] = useState<Schedule | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [detailSchedule, setDetailSchedule] = useState<Schedule | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterPropertyId, setFilterPropertyId] = useState('all')
  const [filterEmployeeId, setFilterEmployeeId] = useState('all')

  const changeMonth = (delta: number) => {
    let year = viewYear
    let month = viewMonth + delta
    if (month < 0) {
      month = 11
      year -= 1
    } else if (month > 11) {
      month = 0
      year += 1
    }
    const newWeeks = getWeeksInMonth(year, month)
    const newWeek = pickWeekContaining(newWeeks, today)
    setViewYear(year)
    setViewMonth(month)
    setSelectedWeek(newWeek)
    setSelectedDateIso(toISODate(pickDateWithinWeek(newWeek, today)))
  }

  const pickWeek = (week: WeekRange) => {
    setSelectedWeek(week)
    setSelectedDateIso(toISODate(pickDateWithinWeek(week, today)))
  }

  const propertyMap = new Map((properties ?? []).map((p) => [p.id, p.name]))
  const serviceTypeMap = new Map((serviceTypes ?? []).map((t) => [t.id, t.name]))
  const employeeMap = new Map((employees ?? []).map((e) => [e.id, e.name]))

  const dayRows = (schedules ?? [])
    .filter((s) => s.scheduledDate === selectedDateIso)
    .filter((s) => filterPropertyId === 'all' || s.propertyId === filterPropertyId)
    .filter((s) => filterEmployeeId === 'all' || s.employeeId === filterEmployeeId)

  const activeFilterCount = (filterPropertyId !== 'all' ? 1 : 0) + (filterEmployeeId !== 'all' ? 1 : 0)

  const selectedDate = parseISODate(selectedDateIso)

  const handleExport = async () => {
    setExporting(true)
    setExportError(null)
    try {
      await exportSchedulesToExcel(dayRows, propertyMap, serviceTypeMap, employeeMap, selectedDateIso)
    } catch (err) {
      setExportError(getErrorMessage(err, 'No se pudo generar el Excel.'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="pb-10">
      <PageHeader
        title="Horarios"
        subtitle="Agenda semanal de servicios por propiedad y empleado"
        action={
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-gold-500 px-3.5 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-400"
          >
            <Plus className="h-4 w-4" />
            Agregar horario
          </button>
        }
      />

      <div className="mx-8 mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="rounded-lg border border-white/10 p-2 text-ink-300 hover:bg-white/5"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-white">{formatMonthLabel(viewYear, viewMonth)}</span>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="rounded-lg border border-white/10 p-2 text-ink-300 hover:bg-white/5"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-8 mt-4 flex flex-wrap justify-center gap-2">
        {weeks.map((week) => {
          const isSelected = toISODate(week.start) === toISODate(selectedWeek.start)
          return (
            <button
              key={toISODate(week.start)}
              type="button"
              onClick={() => pickWeek(week)}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                isSelected
                  ? 'bg-gold-500 text-brand-900'
                  : 'border border-white/10 bg-surface-alt text-ink-300 hover:bg-white/5'
              }`}
            >
              Semana del {formatWeekLabel(week)}
            </button>
          )
        })}
      </div>

      <div className="mx-8 mt-4 flex justify-center gap-1.5">
        {DAY_LABELS.map((label, i) => {
          const day = addDays(selectedWeek.start, i)
          const dayIso = toISODate(day)
          const isSelected = dayIso === selectedDateIso
          return (
            <button
              key={dayIso}
              type="button"
              onClick={() => setSelectedDateIso(dayIso)}
              className={`flex w-16 flex-col items-center rounded-lg px-2 py-2 transition ${
                isSelected ? 'bg-gold-500 text-brand-900' : 'bg-surface-alt text-ink-300 hover:bg-white/5'
              }`}
            >
              <span className="text-xs font-medium">{label}</span>
              <span className="text-sm font-semibold">{day.getDate()}</span>
            </button>
          )
        })}
      </div>

      <div className="mx-8 mt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-ink-300">
            {DAY_LABELS[(selectedDate.getDay() + 6) % 7]} {selectedDate.getDate()} de{' '}
            {formatMonthLabel(selectedDate.getFullYear(), selectedDate.getMonth()).split(' ')[0].toLowerCase()}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2 text-sm font-medium text-ink-300 hover:bg-white/5"
            >
              <Filter className="h-4 w-4" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-500 text-xs font-semibold text-brand-900">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {!loading && !error && dayRows.length > 0 && (
              <button
                type="button"
                disabled={exporting}
                onClick={handleExport}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2 text-sm font-medium text-ink-300 hover:bg-white/5 disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Generando…' : 'Exportar a Excel'}
              </button>
            )}
          </div>
        </div>

        {exportError && <p className="mb-3 text-sm text-red-400">{exportError}</p>}

        {loading && <p className="text-sm text-ink-400">Cargando horarios…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {!loading && !error && dayRows.length === 0 && (
          <p className="rounded-xl border border-white/10 bg-surface-alt px-5 py-8 text-center text-sm text-ink-500">
            {activeFilterCount > 0 ? 'No hay horarios para este día con estos filtros.' : 'No hay horarios para este día.'}
          </p>
        )}

        {!loading && !error && dayRows.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-surface-alt">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-5 py-3 font-medium">Propiedad</th>
                  <th className="px-5 py-3 font-medium">Unidad</th>
                  <th className="px-5 py-3 font-medium">Servicio</th>
                  <th className="px-5 py-3 font-medium">Empleado</th>
                  <th className="px-5 py-3 font-medium">Estatus</th>
                  <th className="px-5 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {dayRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setDetailSchedule(row)}
                    className="cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/5"
                  >
                    <td className="px-5 py-3 text-ink-200">{propertyMap.get(row.propertyId) ?? '—'}</td>
                    <td className="px-5 py-3 text-ink-400">{row.unitLabel || '—'}</td>
                    <td className="px-5 py-3 text-ink-400">{serviceTypeMap.get(row.serviceTypeId) ?? '—'}</td>
                    <td className="px-5 py-3 text-ink-400">{employeeMap.get(row.employeeId) ?? '—'}</td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        disabled={row.status === 'delivered'}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActionSchedule(row)
                        }}
                        className="disabled:cursor-not-allowed"
                        title={row.status === 'delivered' ? 'Ya entregado y cobrado — el estatus no se puede cambiar.' : undefined}
                      >
                        <StatusPill status={row.status} />
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        disabled={row.status === 'delivered'}
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingSchedule(row)
                        }}
                        title={row.status === 'delivered' ? 'Ya entregado y cobrado — no se puede editar.' : undefined}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-ink-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddScheduleModal
        open={addOpen}
        defaultDate={selectedDateIso}
        properties={properties ?? []}
        serviceTypes={serviceTypes ?? []}
        employees={employees ?? []}
        onClose={() => setAddOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />

      <ScheduleActionModal
        schedule={actionSchedule}
        onClose={() => setActionSchedule(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />

      <EditScheduleModal
        schedule={editingSchedule}
        properties={properties ?? []}
        serviceTypes={serviceTypes ?? []}
        employees={employees ?? []}
        onClose={() => setEditingSchedule(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />

      <ScheduleDetailModal
        schedule={detailSchedule}
        propertyMap={propertyMap}
        serviceTypeMap={serviceTypeMap}
        employeeMap={employeeMap}
        onClose={() => setDetailSchedule(null)}
      />

      <ScheduleFiltersModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        properties={properties ?? []}
        employees={employees ?? []}
        propertyId={filterPropertyId}
        employeeId={filterEmployeeId}
        onPropertyChange={setFilterPropertyId}
        onEmployeeChange={setFilterEmployeeId}
      />
    </div>
  )
}
