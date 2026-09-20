import { useState } from 'react'
import { Modal } from '../common/Modal'
import type { PayrollExportAudience } from '../../lib/exportPayroll'

export type PayrollExportFormat = 'excel' | 'pdf'

type ExportPayrollModalProps = {
  open: boolean
  onClose: () => void
  onExport: (audience: PayrollExportAudience, format: PayrollExportFormat) => void
  exporting: boolean
}

const optionButtonClass = (active: boolean) =>
  `flex-1 rounded-lg border px-3.5 py-2.5 text-sm font-medium transition ${
    active ? 'border-gold-500 bg-gold-500/10 text-gold-400' : 'border-white/10 bg-surface text-ink-300 hover:bg-white/5'
  }`

export const ExportPayrollModal = ({ open, onClose, onExport, exporting }: ExportPayrollModalProps) => {
  const [audience, setAudience] = useState<PayrollExportAudience>('admin')
  const [format, setFormat] = useState<PayrollExportFormat>('excel')

  return (
    <Modal open={open} onClose={onClose} title="Exportar planilla" widthClassName="max-w-md">
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-ink-200">Contenido</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setAudience('admin')} className={optionButtonClass(audience === 'admin')}>
              Administración
            </button>
            <button type="button" onClick={() => setAudience('employee')} className={optionButtonClass(audience === 'employee')}>
              Empleado
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-500">
            {audience === 'admin'
              ? 'Incluye todo: cobro, notas y ganancia.'
              : 'Sin cobro, notas ni ganancia — solo lo que ve el empleado.'}
          </p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-ink-200">Formato</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setFormat('excel')} className={optionButtonClass(format === 'excel')}>
              Excel
            </button>
            <button type="button" onClick={() => setFormat('pdf')} className={optionButtonClass(format === 'pdf')}>
              PDF
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={exporting}
          onClick={() => onExport(audience, format)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-brand-900 transition hover:bg-gold-400 disabled:opacity-60"
        >
          {exporting ? 'Generando…' : 'Exportar'}
        </button>
      </div>
    </Modal>
  )
}
