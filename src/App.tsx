import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppLayout } from './layout/AppLayout'
import { Cobros } from './pages/Cobros'
import { Configuracion } from './pages/Configuracion'
import { Dashboard } from './pages/Dashboard'
import { Empleados } from './pages/Empleados'
import { Gastos } from './pages/Gastos'
import { Horarios } from './pages/Horarios'
import { Login } from './pages/Login'
import { NotFound } from './pages/NotFound'
import { Planillas } from './pages/Planillas'
import { Propiedades } from './pages/Propiedades'
import { Reportes } from './pages/Reportes'

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
        <Route path="reportes" element={<Reportes />} />
        <Route path="configuracion" element={<Configuracion />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
