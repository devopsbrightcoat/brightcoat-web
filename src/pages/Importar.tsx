import { CheckCircle2, FileSpreadsheet, Upload, XCircle } from 'lucide-react'
import { MockBanner } from '../components/MockBanner'
import { PageHeader } from '../components/PageHeader'

const importHistory = [
  { id: 'imp1', file: 'BrightCoat_Financiero_Agosto.xlsx', date: '2026-08-31 08:12', rows: 214, status: 'success' as const },
  { id: 'imp2', file: 'BrightCoat_Financiero_Julio.xlsx', date: '2026-08-01 09:03', rows: 198, status: 'success' as const },
  { id: 'imp3', file: 'BrightCoat_Empleados.xlsx', date: '2026-07-15 17:44', rows: 12, status: 'error' as const },
]

export const Importar = () => {
  return (
    <div className="pb-10">
      <PageHeader title="Importar Excel" subtitle="Sube el archivo de propiedades, gastos, ingresos o empleados" />
      <MockBanner />

      <div className="mx-8 mt-6 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/15 bg-surface-alt px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
          <Upload className="h-5 w-5 text-ink-400" />
        </span>
        <p className="text-sm font-medium text-ink-200">Arrastra tu archivo aquí, o haz clic para elegirlo</p>
        <p className="text-xs text-ink-500">.xlsx o .csv — hasta 10MB</p>
        <button
          type="button"
          className="mt-2 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-400"
        >
          Elegir archivo
        </button>
      </div>

      <div className="mx-8 mt-6 overflow-x-auto rounded-xl border border-white/10 bg-surface-alt">
        <div className="border-b border-white/10 px-5 py-3.5">
          <p className="text-sm font-semibold text-white">Historial de cargas</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 text-xs uppercase tracking-wide text-ink-500">
              <th className="px-5 py-2.5 font-medium">Archivo</th>
              <th className="px-5 py-2.5 font-medium">Fecha</th>
              <th className="px-5 py-2.5 font-medium">Filas procesadas</th>
              <th className="px-5 py-2.5 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {importHistory.map((item) => (
              <tr key={item.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-ink-500" />
                    <span className="text-ink-200">{item.file}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-ink-400">{item.date}</td>
                <td className="px-5 py-3 tabular-nums text-ink-400">{item.rows}</td>
                <td className="px-5 py-3">
                  {item.status === 'success' ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> Procesado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm text-rose-400">
                      <XCircle className="h-4 w-4" /> Error
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
