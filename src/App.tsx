import { Route, Routes } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import { Configuracion } from './pages/Configuracion'
import { Dashboard } from './pages/Dashboard'
import { Empleados } from './pages/Empleados'
import { Finanzas } from './pages/Finanzas'
import { Importar } from './pages/Importar'
import { Propiedades } from './pages/Propiedades'
import { Reportes } from './pages/Reportes'
import { Trabajos } from './pages/Trabajos'

const App = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="propiedades" element={<Propiedades />} />
        <Route path="trabajos" element={<Trabajos />} />
        <Route path="finanzas" element={<Finanzas />} />
        <Route path="empleados" element={<Empleados />} />
        <Route path="importar" element={<Importar />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="configuracion" element={<Configuracion />} />
      </Route>
    </Routes>
  )
}

export default App
