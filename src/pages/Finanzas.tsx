import { MockBanner } from '../components/MockBanner'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { expenses, income, properties } from '../mocks/data'

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
  const propertyName = (id?: string) => (id ? properties.find((p) => p.id === id)?.name : 'Gasto general') ?? '—'

  return (
    <div className="pb-10">
      <PageHeader title="Finanzas" subtitle="Gastos e ingresos por propiedad" />
      <MockBanner />

      <div className="grid grid-cols-1 gap-6 px-8 pt-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-surface-alt">
          <div className="border-b border-white/10 px-5 py-3.5">
            <p className="text-sm font-semibold text-white">Gastos</p>
          </div>
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
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-surface-alt">
          <div className="border-b border-white/10 px-5 py-3.5">
            <p className="text-sm font-semibold text-white">Ingresos</p>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-wide text-ink-500">
                <th className="px-5 py-2.5 font-medium">Propiedad</th>
                <th className="px-5 py-2.5 font-medium">Referencia</th>
                <th className="px-5 py-2.5 font-medium">Fecha</th>
                <th className="px-5 py-2.5 font-medium">Monto</th>
                <th className="px-5 py-2.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {income.map((entry) => (
                <tr key={entry.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                  <td className="px-5 py-3 text-ink-200">{propertyName(entry.propertyId)}</td>
                  <td className="px-5 py-3 text-ink-400">{entry.clientReference}</td>
                  <td className="px-5 py-3 text-ink-400">{entry.date}</td>
                  <td className="px-5 py-3 tabular-nums text-ink-200">{currency(entry.amount)}</td>
                  <td className="px-5 py-3">
                    <StatusPill status={entry.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
