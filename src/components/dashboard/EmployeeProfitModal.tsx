import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Modal } from '../common/Modal'
import type { EmployeeProfit } from '../../lib/dashboardMetrics'

const COLOR_GOLD = '#e3a730'
const COLOR_BLUE = '#3987e5'
const COLOR_AQUA = '#199e70'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

const formatAxisLabel = (value: number) => {
  if (Math.abs(value) < 1000) return String(Math.round(value))
  return `${(value / 1000).toFixed(1)}k`
}

const axisTick = { fontSize: 12, fill: '#94a3b8' }

const chartTooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  background: '#1e1f25',
  border: '1px solid #ffffff1a',
  color: '#fff',
}

// Mismo tooltip que el chart compacto del Dashboard: además de los montos
// muestra cuántos trabajos componen esa fila (dato que no cabe en la barra).
const ProfitTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}) => {
  if (!active || !payload || payload.length === 0) return null
  const jobCount = (payload[0] as unknown as { payload: { jobCount: number } }).payload.jobCount
  return (
    <div style={chartTooltipStyle} className="px-3 py-2">
      <p className="mb-1 font-medium">{label}</p>
      <p className="text-ink-400">
        {jobCount} {jobCount === 1 ? 'trabajo' : 'trabajos'}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {currency(entry.value)}
        </p>
      ))}
    </div>
  )
}

type EmployeeProfitModalProps = {
  open: boolean
  data: EmployeeProfit[]
  onClose: () => void
}

// Alto por fila de empleado — el chart crece con la cantidad de empleados
// (en vez de comprimirlos todos en una altura fija) para que cada uno tenga
// espacio suficiente para leerse bien.
const ROW_HEIGHT = 48

export const EmployeeProfitModal = ({ open, data, onClose }: EmployeeProfitModalProps) => {
  const chartHeight = Math.max(240, data.length * ROW_HEIGHT)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Vendido, pagado y ganancia por empleado"
      widthClassName="max-w-3xl"
    >
      <p className="mb-4 text-xs text-ink-500">Todos los empleados con planillas en el período seleccionado.</p>
      {data.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-500">No hay planillas cobradas en este período.</p>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={data} layout="vertical" barCategoryGap="25%" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" horizontal={false} />
              <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={formatAxisLabel} />
              <YAxis type="category" dataKey="name" tick={axisTick} axisLine={false} tickLine={false} width={110} />
              <Tooltip content={<ProfitTooltip />} cursor={{ fill: '#ffffff0a' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Bar dataKey="sold" name="Vendido" fill={COLOR_BLUE} radius={[0, 4, 4, 0]} />
              <Bar dataKey="paid" name="Pagado" fill={COLOR_AQUA} radius={[0, 4, 4, 0]} />
              <Bar dataKey="profit" name="Ganancia" fill={COLOR_GOLD} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Modal>
  )
}
