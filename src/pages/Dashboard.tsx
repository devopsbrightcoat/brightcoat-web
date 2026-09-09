import { useMemo } from 'react'
import { Building2, TrendingDown } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '../components/common/PageHeader'
import { StatCard } from '../components/common/StatCard'
import { fetchExpenses, fetchProperties } from '../lib/api'
import { computeMonthlyExpenses } from '../lib/reports'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const Dashboard = () => {
  const { data: properties, loading: loadingProperties, error: errorProperties } = useSupabaseQuery(fetchProperties, [])
  const { data: expenses, loading: loadingExpenses, error: errorExpenses } = useSupabaseQuery(fetchExpenses, [])

  const monthlyExpenses = useMemo(() => computeMonthlyExpenses(expenses ?? []), [expenses])

  const activeProperties = (properties ?? []).filter((p) => p.status === 'active').length
  const lastMonth = monthlyExpenses[monthlyExpenses.length - 1]

  const loading = loadingProperties || loadingExpenses
  const error = errorProperties ?? errorExpenses

  return (
    <div className="pb-10">
      <PageHeader title="Dashboard" subtitle="Resumen general del negocio" />

      {error ? (
        <p className="mx-8 mt-6 text-sm text-red-400">No se pudieron cargar los datos: {error}</p>
      ) : loading ? (
        <p className="mx-8 mt-6 text-sm text-ink-500">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 px-8 pt-6 sm:grid-cols-2">
            <StatCard label="Propiedades activas" value={String(activeProperties)} icon={Building2} />
            <StatCard label="Gastos — este mes" value={currency(lastMonth.expenses)} icon={TrendingDown} />
          </div>

          <div className="px-8 pt-6">
            <div className="rounded-xl border border-white/10 bg-surface-alt p-5">
              <p className="text-sm font-semibold text-white">Gastos</p>
              <p className="text-xs text-ink-500">Últimos 6 meses</p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyExpenses} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(value) => currency(Number(value))}
                      contentStyle={{ fontSize: 12, borderRadius: 8, background: '#1e1f25', border: '1px solid #ffffff1a', color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="expenses" name="Gastos" stroke="#f87171" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
