import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppLayout } from './layout/AppLayout'
import { Configuracion } from './pages/Configuracion'
import { Dashboard } from './pages/Dashboard'
import { Empleados } from './pages/Empleados'
import { Finanzas } from './pages/Finanzas'
import { Horarios } from './pages/Horarios'
import { Importar } from './pages/Importar'
import { Login } from './pages/Login'
import { NotFound } from './pages/NotFound'
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
        <Route path="finanzas" element={<Finanzas />} />
        <Route path="empleados" element={<Empleados />} />
        <Route path="importar" element={<Importar />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="configuracion" element={<Configuracion />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
