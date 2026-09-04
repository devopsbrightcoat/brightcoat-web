import { useMemo } from 'react'
import { Building2, ClipboardList, TrendingDown, TrendingUp } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { StatusPill } from '../components/StatusPill'
import { fetchEmployees, fetchExpenses, fetchProperties, fetchServiceTypes, fetchServices } from '../lib/api'
import { computeMonthlyFinancials } from '../lib/reports'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const Dashboard = () => {
  const { data: properties, loading: loadingProperties, error: errorProperties } = useSupabaseQuery(fetchProperties, [])
  const { data: services, loading: loadingServices, error: errorServices } = useSupabaseQuery(fetchServices, [])
  const { data: expenses } = useSupabaseQuery(fetchExpenses, [])
  const { data: serviceTypes } = useSupabaseQuery(fetchServiceTypes, [])
  const { data: employees } = useSupabaseQuery(fetchEmployees, [])

  const monthlyFinancials = useMemo(
    () => computeMonthlyFinancials(services ?? [], expenses ?? []),
    [services, expenses],
  )

  const activeProperties = (properties ?? []).filter((p) => p.status === 'active').length
  const pendingServices = (services ?? []).filter((s) => s.status !== 'completed').length
  const lastMonth = monthlyFinancials[monthlyFinancials.length - 1]

  const propertyName = (id: string) => properties?.find((p) => p.id === id)?.name ?? '—'
  const serviceTypeName = (id: string) => serviceTypes?.find((s) => s.id === id)?.name ?? '—'
  const employeeName = (id?: string) => employees?.find((e) => e.id === id)?.name ?? 'Sin asignar'

  const upcoming = (services ?? [])
    .filter((s) => s.status !== 'completed')
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .slice(0, 5)

  const loading = loadingProperties || loadingServices
  const error = errorProperties ?? errorServices

  return (
    <div className="pb-10">
      <PageHeader title="Dashboard" subtitle="Resumen general del negocio" />

      {error ? (
        <p className="mx-8 mt-6 text-sm text-red-400">No se pudieron cargar los datos: {error}</p>
      ) : loading ? (
        <p className="mx-8 mt-6 text-sm text-ink-500">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 px-8 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Propiedades activas" value={String(activeProperties)} icon={Building2} />
            <StatCard label="Trabajos pendientes" value={String(pendingServices)} icon={ClipboardList} tone="warn" />
            <StatCard label="Ingresos — este mes" value={currency(lastMonth.income)} icon={TrendingUp} tone="good" />
            <StatCard label="Gastos — este mes" value={currency(lastMonth.expenses)} icon={TrendingDown} />
          </div>

          <div className="grid grid-cols-1 gap-6 px-8 pt-6 lg:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-surface-alt p-5 lg:col-span-2">
              <p className="text-sm font-semibold text-white">Ingresos vs. gastos</p>
              <p className="text-xs text-ink-500">Últimos 6 meses</p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyFinancials} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(value) => currency(Number(value))}
                      contentStyle={{ fontSize: 12, borderRadius: 8, background: '#1e1f25', border: '1px solid #ffffff1a', color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="income" name="Ingresos" stroke="#cf9122" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="expenses" name="Gastos" stroke="#f87171" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-surface-alt p-5">
              <p className="text-sm font-semibold text-white">Próximos trabajos</p>
              <p className="text-xs text-ink-500">Pendientes y en proceso</p>
              {upcoming.length === 0 ? (
                <p className="mt-4 text-sm text-ink-500">No hay trabajos pendientes.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {upcoming.map((s) => (
                    <li key={s.id} className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{propertyName(s.propertyId)}</p>
                        <p className="truncate text-xs text-ink-500">
                          {serviceTypeName(s.serviceTypeId)} · {employeeName(s.employeeId)}
                        </p>
                      </div>
                      <StatusPill status={s.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
