import { useEffect, useState } from 'react'
import {
  Building2,
  CalendarClock,
  ChevronDown,
  LayoutDashboard,
  LineChart,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
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
      { to: '/finanzas/impuestos', label: 'Impuestos' },
      { to: '/finanzas/proveedores', label: 'Proveedores' },
    ],
  },
  { to: '/planillas', label: 'Planillas', icon: Receipt },
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
      { to: '/configuracion/cobros-fijos', label: 'Cobros fijos' },
    ],
  },
]

const roleLabel: Record<string, string> = {
  owner: 'Dueño',
  admin: 'Administrador',
  staff: 'Staff',
  finance: 'Finanzas',
}

const SIDEBAR_COLLAPSED_KEY = 'brightcoat-sidebar-collapsed'

export const AppLayout = () => {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  // Colapsar la barra lateral a solo íconos — preferencia del usuario, se
  // recuerda entre sesiones (localStorage, no hace falta guardarlo en la
  // base de datos). Un item con submenu (Finanzas/Reportes/Configuración)
  // al hacer clic estando colapsada expande la barra completa en vez de
  // mostrar un flyout — más simple y sin sorpresas.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0')
    } catch {
      // localStorage no disponible (modo privado, etc.) — no es crítico.
    }
  }, [collapsed])

  // Si la ruta actual cae bajo un item con submenu (ej. /finanzas/gastos),
  // lo abrimos automáticamente para reflejar dónde está el usuario.
  useEffect(() => {
    const match = navItems.find((item) => item.children && location.pathname.startsWith(item.to))
    if (match) setOpenMenu(match.to)
  }, [location.pathname])

  const handleParentClick = (to: string) => {
    if (collapsed) {
      setCollapsed(false)
      setOpenMenu(to)
      return
    }
    setOpenMenu(openMenu === to ? null : to)
  }

  return (
    <div className="flex h-screen bg-surface">
      <aside
        className={[
          'flex h-screen shrink-0 flex-col bg-brand-900 transition-[width] duration-200',
          collapsed ? 'w-[76px]' : 'w-64',
        ].join(' ')}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-3 border-b border-white/10 px-2 py-5">
            <img src="/favicon.png" alt="BrightCoat" className="h-9 w-9 shrink-0" />
            {profile?.role !== 'staff' && <NotificationBell />}
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              title="Expandir menú"
              className="rounded-md p-1.5 text-brand-300 transition hover:bg-white/10 hover:text-white"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
            <img src="/favicon.png" alt="BrightCoat" className="h-9 w-9 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">BrightCoat Ops</p>
              <p className="truncate text-xs text-brand-300">Panel interno</p>
            </div>
            {profile?.role !== 'staff' && <NotificationBell />}
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              title="Colapsar menú"
              className="shrink-0 rounded-md p-1.5 text-brand-300 transition hover:bg-white/10 hover:text-white"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-4">
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
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                      collapsed ? 'justify-center' : '',
                      isActive ? 'bg-gold-500 text-brand-900' : 'text-brand-200 hover:bg-white/5 hover:text-white',
                    ].join(' ')
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && label}
                </NavLink>
              )
            }

            const isParentActive = location.pathname.startsWith(to)
            const isOpen = openMenu === to && !collapsed

            return (
              <div key={to}>
                <button
                  type="button"
                  title={collapsed ? label : undefined}
                  onClick={() => handleParentClick(to)}
                  className={[
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                    collapsed ? 'justify-center' : '',
                    isParentActive ? 'text-white' : 'text-brand-200 hover:bg-white/5 hover:text-white',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{label}</span>
                      <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </>
                  )}
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
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white"
                title={profile?.fullName || profile?.username || 'Usuario'}
              >
                {(profile?.fullName || profile?.username || 'U').charAt(0).toUpperCase()}
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
          ) : (
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
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  )
}
