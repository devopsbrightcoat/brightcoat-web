import { useMemo, useState } from 'react'
import { Download, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '../components/PageHeader'
import { Pagination } from '../components/Pagination'
import { StatCard } from '../components/StatCard'
import { StatusPill } from '../components/StatusPill'
import { fetchExpenses, fetchProperties, fetchServiceTypes, fetchServices } from '../lib/api'
import { usePagination } from '../lib/usePagination'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const categoryLabels: Record<string, string> = {
  materials: 'Materiales',
  labor: 'Mano de obra',
  transport: 'Transporte',
  tools: 'Herramientas',
  other: 'Otro',
}

export const Reportes = () => {
  const [propertyId, setPropertyId] = useState('all')
  const [serviceTypeId, setServiceTypeId] = useState('all')

  const { data: services, loading: loadingServices, error: errorServices } = useSupabaseQuery(fetchServices, [])
  const { data: expenses } = useSupabaseQuery(fetchExpenses, [])
  const { data: properties } = useSupabaseQuery(fetchProperties, [])
  const { data: serviceTypes } = useSupabaseQuery(fetchServiceTypes, [])

  const propertyName = (id: string) => properties?.find((p) => p.id === id)?.name ?? '—'
  const serviceTypeName = (id: string) => serviceTypes?.find((s) => s.id === id)?.name ?? '—'

  const filteredServices = useMemo(
    () =>
      (services ?? []).filter(
        (s) =>
          (propertyId === 'all' || s.propertyId === propertyId) &&
          (serviceTypeId === 'all' || s.serviceTypeId === serviceTypeId),
      ),
    [services, propertyId, serviceTypeId],
  )

  const filteredExpenses = useMemo(
    () => (expenses ?? []).filter((e) => propertyId === 'all' || e.propertyId === propertyId),
    [expenses, propertyId],
  )

  const totalIncome = filteredServices.reduce((sum, s) => sum + s.cost, 0)
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)

  const { page, setPage, totalPages, pageItems } = usePagination(filteredServices)

  const expensesByCategory = useMemo(() => {
    const categories = ['materials', 'labor', 'transport', 'tools', 'other'] as const
    return categories
      .map((category) => ({
        category: categoryLabels[category],
        total: filteredExpenses.filter((e) => e.category === category).reduce((sum, e) => sum + e.amount, 0),
      }))
      .filter((row) => row.total > 0)
  }, [filteredExpenses])

  return (
    <div className="pb-10">
      <PageHeader
        title="Reportes"
        subtitle="Financiero por propiedad y tipo de servicio"
        action={
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-alt px-3.5 py-2 text-sm font-medium text-ink-300 hover:bg-white/5"
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </button>
        }
      />

      <div className="mx-8 mt-6 flex flex-wrap gap-3">
        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="rounded-lg border border-white/10 bg-surface-alt px-3 py-2 text-sm text-ink-200"
        >
          <option value="all">Todas las propiedades</option>
          {(properties ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={serviceTypeId}
          onChange={(e) => setServiceTypeId(e.target.value)}
          className="rounded-lg border border-white/10 bg-surface-alt px-3 py-2 text-sm text-ink-200"
        >
          <option value="all">Todos los tipos de servicio</option>
          {(serviceTypes ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 px-8 pt-6 sm:grid-cols-3">
        <StatCard label="Ingresos" value={currency(totalIncome)} icon={TrendingUp} tone="good" />
        <StatCard label="Gastos" value={currency(totalExpenses)} icon={TrendingDown} />
        <StatCard label="Neto" value={currency(totalIncome - totalExpenses)} icon={Wallet} tone="good" />
      </div>

      <div className="grid grid-cols-1 gap-6 px-8 pt-6 lg:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-surface-alt p-5 lg:col-span-1">
          <p className="text-sm font-semibold text-white">Gastos por categoría</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expensesByCategory} margin={{ left: -20, right: 10, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => currency(Number(value))}
                  contentStyle={{ fontSize: 12, borderRadius: 8, background: '#1e1f25', border: '1px solid #ffffff1a', color: '#fff' }}
                />
                <Bar dataKey="total" fill="#cf9122" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex max-h-[calc(100vh-460px)] flex-col overflow-hidden rounded-xl border border-white/10 bg-surface-alt lg:col-span-2">
          <div className="border-b border-white/10 px-5 py-3.5">
            <p className="text-sm font-semibold text-white">Servicios en el filtro actual</p>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-surface-alt">
                <tr className="border-b border-white/5 text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-5 py-2.5 font-medium">Propiedad</th>
                  <th className="px-5 py-2.5 font-medium">Servicio</th>
                  <th className="px-5 py-2.5 font-medium">Costo</th>
                  <th className="px-5 py-2.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {loadingServices ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-sm text-ink-500">
                      Cargando servicios…
                    </td>
                  </tr>
                ) : errorServices ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-sm text-red-400">
                      No se pudieron cargar los servicios: {errorServices}
                    </td>
                  </tr>
                ) : filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-sm text-ink-500">
                      No hay servicios con estos filtros.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((s) => (
                    <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                      <td className="px-5 py-3 text-ink-200">{propertyName(s.propertyId)}</td>
                      <td className="px-5 py-3 text-ink-400">{serviceTypeName(s.serviceTypeId)}</td>
                      <td className="px-5 py-3 tabular-nums text-ink-400">{currency(s.cost)}</td>
                      <td className="px-5 py-3">
                        <StatusPill status={s.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>
    </div>
  )
}
