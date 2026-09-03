import {
  Building2,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  LineChart,
  Settings,
  Upload,
  Users,
  Wallet,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/propiedades', label: 'Propiedades', icon: Building2 },
  { to: '/trabajos', label: 'Trabajos', icon: ClipboardList },
  { to: '/finanzas', label: 'Finanzas', icon: Wallet },
  { to: '/empleados', label: 'Empleados', icon: Users },
  { to: '/importar', label: 'Importar Excel', icon: Upload },
  { to: '/reportes', label: 'Reportes', icon: LineChart },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
]

export const AppLayout = () => {
  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="flex w-64 shrink-0 flex-col bg-brand-900">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
          <img src="/favicon.png" alt="BrightCoat" className="h-9 w-9 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">BrightCoat Ops</p>
            <p className="text-xs text-brand-300">Panel interno</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-gold-500 text-brand-900'
                    : 'text-brand-200 hover:bg-white/5 hover:text-white',
                ].join(' ')
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2.5">
            <FileSpreadsheet className="h-4 w-4 text-brand-300" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-brand-100">Datos de ejemplo</p>
              <p className="truncate text-[11px] text-brand-400">Aún sin conectar a Supabase</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  )
}
