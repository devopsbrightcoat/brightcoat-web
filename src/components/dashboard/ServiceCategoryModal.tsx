import { Modal } from '../common/Modal'
import { RankingBars } from './RankingBars'
import type { ServiceCategoryRevenue } from '../../lib/dashboardMetrics'

const COLOR_GOLD = '#e3a730'

const currency = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

type ServiceCategoryModalProps = {
  category: ServiceCategoryRevenue | null
  onClose: () => void
}

// Desglose por tipo de servicio dentro de una categoría — se abre al hacer
// clic en una barra de "Ingresos por categoría" (Dashboard, Reportes ›
// Financiero). Reusa el Modal + RankingBars compartidos en vez de un
// componente de detalle a medida.
export const ServiceCategoryModal = ({ category, onClose }: ServiceCategoryModalProps) => {
  return (
    <Modal open={category !== null} onClose={onClose} title={category ? `Ingresos — ${category.label}` : ''}>
      <RankingBars
        items={(category?.services ?? []).map((s) => ({ id: s.serviceTypeId ?? s.label, label: s.label, value: s.revenue }))}
        formatValue={currency}
        color={COLOR_GOLD}
        emptyText="No hay cobros en este período."
      />
    </Modal>
  )
}
