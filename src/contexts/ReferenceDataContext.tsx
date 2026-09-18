import { createContext, useContext, type ReactNode } from 'react'
import { fetchEmployees, fetchProperties, fetchServiceTypes } from '../lib/api'
import { useSupabaseQuery } from '../lib/useSupabaseQuery'
import type { Employee, Property, ServiceType } from '../types'

// Propiedades, empleados y tipos de servicio son datos de referencia que
// casi no cambian, pero se necesitan en casi cada pantalla (Cobros,
// Horarios, Dashboard, Planillas, Reportes...) — antes cada una los
// volvía a pedir por su cuenta con su propio useSupabaseQuery, así que
// entrar a la app disparaba una docena de fetches redundantes de las
// mismas tablas. Este Provider los trae UNA sola vez (al entrar a la zona
// autenticada, ver App.tsx) y los comparte por contexto. Las pantallas que
// SÍ los editan (Propiedades, Empleados, ConfiguracionServicios) llaman a
// refetchProperties/refetchEmployees/refetchServiceTypes después de
// guardar/borrar en vez de mantener su propio refreshKey.
type ReferenceDataValue = {
  properties: Property[] | null
  loadingProperties: boolean
  errorProperties: string | null
  refetchProperties: () => void

  employees: Employee[] | null
  loadingEmployees: boolean
  errorEmployees: string | null
  refetchEmployees: () => void

  serviceTypes: ServiceType[] | null
  loadingServiceTypes: boolean
  errorServiceTypes: string | null
  refetchServiceTypes: () => void
}

const ReferenceDataContext = createContext<ReferenceDataValue | null>(null)

export const ReferenceDataProvider = ({ children }: { children: ReactNode }) => {
  const propertiesQuery = useSupabaseQuery(fetchProperties, [])
  const employeesQuery = useSupabaseQuery(fetchEmployees, [])
  const serviceTypesQuery = useSupabaseQuery(fetchServiceTypes, [])

  const value: ReferenceDataValue = {
    properties: propertiesQuery.data,
    loadingProperties: propertiesQuery.loading,
    errorProperties: propertiesQuery.error,
    refetchProperties: propertiesQuery.refetch,

    employees: employeesQuery.data,
    loadingEmployees: employeesQuery.loading,
    errorEmployees: employeesQuery.error,
    refetchEmployees: employeesQuery.refetch,

    serviceTypes: serviceTypesQuery.data,
    loadingServiceTypes: serviceTypesQuery.loading,
    errorServiceTypes: serviceTypesQuery.error,
    refetchServiceTypes: serviceTypesQuery.refetch,
  }

  return <ReferenceDataContext.Provider value={value}>{children}</ReferenceDataContext.Provider>
}

export const useReferenceData = (): ReferenceDataValue => {
  const ctx = useContext(ReferenceDataContext)
  if (!ctx) throw new Error('useReferenceData debe usarse dentro de <ReferenceDataProvider>')
  return ctx
}
