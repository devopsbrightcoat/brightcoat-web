import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppLayout } from './layout/AppLayout'
import { Cobros } from './pages/Cobros'
import { ConfiguracionAlertas } from './pages/ConfiguracionAlertas'
import { ConfiguracionGastosFijos } from './pages/ConfiguracionGastosFijos'
import { ConfiguracionGeneral } from './pages/ConfiguracionGeneral'
import { ConfiguracionServicios } from './pages/ConfiguracionServicios'
import { Dashboard } from './pages/Dashboard'
import { Empleados } from './pages/Empleados'
import { Gastos } from './pages/Gastos'
import { Horarios } from './pages/Horarios'
import { Login } from './pages/Login'
import { NotFound } from './pages/NotFound'
import { Planillas } from './pages/Planillas'
import { Propiedades } from './pages/Propiedades'
import { ReportesCobros } from './pages/reportes/ReportesCobros'
import { ReportesFinanciero } from './pages/reportes/ReportesFinanciero'
import { ReportesOperaciones } from './pages/reportes/ReportesOperaciones'
import { ReportesGastos } from './pages/reportes/ReportesGastos'
import { ReportesPlanilla } from './pages/reportes/ReportesPlanilla'

const App = () => {
  return (
    <Routes>
      <Route path="login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="propiedades" element={<Propiedades />} />
        <Route path="horarios" element={<Horarios />} />
        <Route path="finanzas">
          <Route index element={<Navigate to="cobros" replace />} />
          <Route path="cobros" element={<Cobros />} />
          <Route path="gastos" element={<Gastos />} />
          <Route path="planillas" element={<Planillas />} />
        </Route>
        <Route path="empleados" element={<Empleados />} />
        <Route path="reportes">
          <Route index element={<Navigate to="financiero" replace />} />
          <Route path="financiero" element={<ReportesFinanciero />} />
          <Route path="cobros" element={<ReportesCobros />} />
          <Route path="gastos" element={<ReportesGastos />} />
          <Route path="planilla" element={<ReportesPlanilla />} />
          <Route path="operaciones" element={<ReportesOperaciones />} />
        </Route>
        <Route path="configuracion">
          <Route index element={<Navigate to="general" replace />} />
          <Route path="general" element={<ConfiguracionGeneral />} />
          <Route path="alertas" element={<ConfiguracionAlertas />} />
          <Route path="servicios" element={<ConfiguracionServicios />} />
          <Route path="gastos-fijos" element={<ConfiguracionGastosFijos />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
