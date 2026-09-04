import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { fetchExpenses, fetchProperties, fetchServiceTypes, fetchServices } from '../lib/api'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import type { Service } from '../types'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const categoryLabels: Record<string, string> = {
  materials: 'Materiales',
  labor: 'Mano de obra',
  transport: 'Transporte',
  tools: 'Herramientas',
  other: 'Otro',
}

export const Finanzas = () => {
  const { data: expenses, loading: loadingExpenses, error: errorExpenses } = useSupabaseQuery(fetchExpenses, [])
  const { data: services, loading: loadingServices, error: errorServices } = useSupabaseQuery(fetchServices, [])
  const { data: properties } = useSupabaseQuery(fetchProperties, [])
  const { data: serviceTypes } = useSupabaseQuery(fetchServiceTypes, [])

  const propertyName = (id?: string) => (id ? properties?.find((p) => p.id === id)?.name : 'Gasto general') ?? '—'
  const serviceReference = (s: Service) => {
    const typeName = serviceTypes?.find((t) => t.id === s.serviceTypeId)?.name ?? 'Servicio'
    return s.unitLabel ? `${typeName} — ${s.unitLabel}` : typeName
  }

  return (
    <div className="pb-10">
      <PageHeader title="Finanzas" subtitle="Gastos e ingresos por propiedad" />

      <div className="grid grid-cols-1 gap-6 px-8 pt-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-surface-alt">
          <div className="border-b border-white/10 px-5 py-3.5">
            <p className="text-sm font-semibold text-white">Gastos</p>
          </div>
          {loadingExpenses ? (
            <p className="px-5 py-6 text-sm text-ink-500">Cargando gastos…</p>
          ) : errorExpenses ? (
            <p className="px-5 py-6 text-sm text-red-400">No se pudieron cargar los gastos: {errorExpenses}</p>
          ) : !expenses || expenses.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-500">Todavía no hay gastos registrados.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-5 py-2.5 font-medium">Propiedad</th>
                  <th className="px-5 py-2.5 font-medium">Categoría</th>
                  <th className="px-5 py-2.5 font-medium">Fecha</th>
                  <th className="px-5 py-2.5 font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                    <td className="px-5 py-3 text-ink-200">{propertyName(expense.propertyId)}</td>
                    <td className="px-5 py-3 text-ink-400">{categoryLabels[expense.category]}</td>
                    <td className="px-5 py-3 text-ink-400">{expense.date}</td>
                    <td className="px-5 py-3 tabular-nums text-ink-200">{currency(expense.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-surface-alt">
          <div className="border-b border-white/10 px-5 py-3.5">
            <p className="text-sm font-semibold text-white">Cobros</p>
          </div>
          {loadingServices ? (
            <p className="px-5 py-6 text-sm text-ink-500">Cargando cobros…</p>
          ) : errorServices ? (
            <p className="px-5 py-6 text-sm text-red-400">No se pudieron cargar los cobros: {errorServices}</p>
          ) : !services || services.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-500">Todavía no hay cobros registrados.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-5 py-2.5 font-medium">Propiedad</th>
                  <th className="px-5 py-2.5 font-medium">Servicio</th>
                  <th className="px-5 py-2.5 font-medium">Fecha</th>
                  <th className="px-5 py-2.5 font-medium">Monto</th>
                  <th className="px-5 py-2.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                    <td className="px-5 py-3 text-ink-200">{propertyName(service.propertyId)}</td>
                    <td className="px-5 py-3 text-ink-400">{serviceReference(service)}</td>
                    <td className="px-5 py-3 text-ink-400">{service.paidDate || service.scheduledDate || '—'}</td>
                    <td className="px-5 py-3 tabular-nums text-ink-200">{currency(service.cost)}</td>
                    <td className="px-5 py-3">
                      <StatusPill status={service.paymentStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
