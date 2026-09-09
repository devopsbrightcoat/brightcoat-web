import { Modal } from '../common/Modal'
import type { Expense } from '../../types'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
    <p className="mt-1 text-sm text-white">{value}</p>
  </div>
)

// Vista de solo lectura de un gasto — se abre al hacer clic en cualquier
// parte de una fila de la tabla de Gastos (ver onRowClick en
// DataTablePanel.tsx). El botón "Editar" detiene la propagación para no
// chocar con este modal (ver Gastos.tsx).
type ExpenseDetailModalProps = {
  expense: Expense | null
  onClose: () => void
}

export const ExpenseDetailModal = ({ expense, onClose }: ExpenseDetailModalProps) => (
  <Modal open={expense !== null} onClose={onClose} title="Detalle del gasto">
    {expense && (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Número de factura" value={expense.invoiceNumber || '—'} />
          <Field label="Monto" value={<span className="tabular-nums">{currency(expense.amount)}</span>} />
          <Field label="Fecha" value={expense.date || '—'} />
        </div>

        <Field label="Descripción" value={expense.description || '—'} />
      </div>
    )}
  </Modal>
)
