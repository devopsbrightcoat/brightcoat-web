import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { ReferenceDataProvider } from './contexts/ReferenceDataContext'
import { AppLayout } from './layout/AppLayout'
import { Cobros } from './pages/Cobros'
import { ConfiguracionAlertas } from './pages/ConfiguracionAlertas'
import { ConfiguracionCobrosFijos } from './pages/ConfiguracionCobrosFijos'
import { ConfiguracionGastosFijos } from './pages/ConfiguracionGastosFijos'
import { ConfiguracionGeneral } from './pages/ConfiguracionGeneral'
import { ConfiguracionServicios } from './pages/ConfiguracionServicios'
import { Dashboard } from './pages/Dashboard'
import { Empleados } from './pages/Empleados'
import { Estimados } from './pages/Estimados'
import { Gastos } from './pages/Gastos'
import { Horarios } from './pages/Horarios'
import { Impuestos } from './pages/Impuestos'
import { Login } from './pages/Login'
import { NotFound } from './pages/NotFound'
import { Planillas } from './pages/Planillas'
import { Propiedades } from './pages/Propiedades'
import { Proveedores } from './pages/Proveedores'
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
            <ReferenceDataProvider>
              <AppLayout />
            </ReferenceDataProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="horarios" element={<Horarios />} />
        <Route path="finanzas">
          <Route index element={<Navigate to="cobros" replace />} />
          <Route path="cobros" element={<Cobros />} />
          <Route path="gastos" element={<Gastos />} />
          <Route path="impuestos" element={<Impuestos />} />
        </Route>
        <Route path="planillas" element={<Planillas />} />
        <Route path="estimados" element={<Estimados />} />
        <Route path="reportes">
          <Route index element={<Navigate to="financiero" replace />} />
          <Route path="financiero" element={<ReportesFinanciero />} />
          <Route path="cobros" element={<ReportesCobros />} />
          <Route path="gastos" element={<ReportesGastos />} />
          <Route path="planilla" element={<ReportesPlanilla />} />
          <Route path="operaciones" element={<ReportesOperaciones />} />
        </Route>
        <Route path="catalogos">
          <Route index element={<Navigate to="servicios" replace />} />
          <Route path="propiedades" element={<Propiedades />} />
          <Route path="servicios" element={<ConfiguracionServicios />} />
          <Route path="gastos-fijos" element={<ConfiguracionGastosFijos />} />
          <Route path="cobros-fijos" element={<ConfiguracionCobrosFijos />} />
          <Route path="empleados" element={<Empleados />} />
          <Route path="proveedores" element={<Proveedores />} />
        </Route>
        {/* Ruta anterior: ahora vive bajo /catalogos. Se deja como
            redirección para no romper enlaces o marcadores viejos. */}
        <Route path="propiedades" element={<Navigate to="/catalogos/propiedades" replace />} />
        <Route path="configuracion">
          <Route index element={<Navigate to="general" replace />} />
          <Route path="general" element={<ConfiguracionGeneral />} />
          <Route path="alertas" element={<ConfiguracionAlertas />} />
          {/* Rutas anteriores: ahora viven bajo /catalogos. Se dejan como
              redirecciones para no romper enlaces o marcadores viejos. */}
          <Route path="servicios" element={<Navigate to="/catalogos/servicios" replace />} />
          <Route path="gastos-fijos" element={<Navigate to="/catalogos/gastos-fijos" replace />} />
          <Route path="cobros-fijos" element={<Navigate to="/catalogos/cobros-fijos" replace />} />
          <Route path="empleados" element={<Navigate to="/catalogos/empleados" replace />} />
          <Route path="proveedores" element={<Navigate to="/catalogos/proveedores" replace />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
