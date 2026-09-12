import { useEffect, useState } from 'react'
import {
  Building2,
  CalendarClock,
  ChevronDown,
  LayoutDashboard,
  LineChart,
  LogOut,
  Settings,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth, type ProfileRole } from '../auth/AuthProvider'
import { NotificationBell } from '../components/notifications/NotificationBell'

type NavChild = { to: string; label: string; hiddenForRoles?: ProfileRole[] }
type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean; children?: NavChild[] }

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/propiedades', label: 'Propiedades', icon: Building2 },
  { to: '/horarios', label: 'Horarios', icon: CalendarClock },
  {
    to: '/finanzas',
    label: 'Finanzas',
    icon: Wallet,
    children: [
      { to: '/finanzas/cobros', label: 'Cobros' },
      { to: '/finanzas/gastos', label: 'Gastos' },
      { to: '/finanzas/planillas', label: 'Planillas' },
    ],
  },
  { to: '/empleados', label: 'Empleados', icon: Users },
  {
    to: '/reportes',
    label: 'Reportes',
    icon: LineChart,
    children: [
      { to: '/reportes/financiero', label: 'Financiero' },
      { to: '/reportes/cobros', label: 'Cobros' },
      { to: '/reportes/gastos', label: 'Gastos' },
      { to: '/reportes/planilla', label: 'Planilla' },
      { to: '/reportes/operaciones', label: 'Operaciones' },
    ],
  },
  {
    to: '/configuracion',
    label: 'Configuración',
    icon: Settings,
    children: [
      { to: '/configuracion/general', label: 'General' },
      // Sin esta pantalla para staff — ver ConfiguracionAlertas.tsx.
      { to: '/configuracion/alertas', label: 'Alertas', hiddenForRoles: ['staff'] },
      { to: '/configuracion/servicios', label: 'Servicios' },
      { to: '/configuracion/gastos-fijos', label: 'Gastos fijos' },
    ],
  },
]

const roleLabel: Record<string, string> = {
  owner: 'Dueño',
  admin: 'Administrador',
  staff: 'Staff',
  finance: 'Finanzas',
}

export const AppLayout = () => {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  // Si la ruta actual cae bajo un item con submenu (ej. /finanzas/gastos),
  // lo abrimos automáticamente para reflejar dónde está el usuario.
  useEffect(() => {
    const match = navItems.find((item) => item.children && location.pathname.startsWith(item.to))
    if (match) setOpenMenu(match.to)
  }, [location.pathname])

  return (
    <div className="flex h-screen bg-surface">
      <aside className="flex h-screen w-64 shrink-0 flex-col bg-brand-900">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
          <img src="/favicon.png" alt="BrightCoat" className="h-9 w-9 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">BrightCoat Ops</p>
            <p className="truncate text-xs text-brand-300">Panel interno</p>
          </div>
          {profile?.role !== 'staff' && <NotificationBell />}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map(({ to, label, icon: Icon, end, children: rawChildren }) => {
            const children = rawChildren?.filter(
              (child) => !profile || !child.hiddenForRoles?.includes(profile.role),
            )
            if (!children) {
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                      isActive ? 'bg-gold-500 text-brand-900' : 'text-brand-200 hover:bg-white/5 hover:text-white',
                    ].join(' ')
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </NavLink>
              )
            }

            const isParentActive = location.pathname.startsWith(to)
            const isOpen = openMenu === to

            return (
              <div key={to}>
                <button
                  type="button"
                  onClick={() => setOpenMenu(isOpen ? null : to)}
                  className={[
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                    isParentActive ? 'text-white' : 'text-brand-200 hover:bg-white/5 hover:text-white',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="mt-1 space-y-1 pl-8">
                    {children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) =>
                          [
                            'block rounded-lg px-3 py-2 text-sm font-medium transition',
                            isActive
                              ? 'bg-gold-500 text-brand-900'
                              : 'text-brand-200 hover:bg-white/5 hover:text-white',
                          ].join(' ')
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-brand-100">
                {profile?.fullName || profile?.username || 'Usuario'}
              </p>
              <p className="truncate text-[11px] text-brand-400">
                {profile ? roleLabel[profile.role] ?? profile.role : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              title="Cerrar sesión"
              className="rounded-md p-1.5 text-brand-300 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  )
}
