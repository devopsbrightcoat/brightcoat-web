import { fetchCompanySettings } from './api'

// Datos de la empresa que se imprimen en el encabezado de los PDFs
// (Planillas, Estimados, etc.) — se leen de Configuración > General
// (tabla company_settings) para que un cambio ahí se refleje en todos los
// PDFs sin tocar código. Si el registro no existe o falla la consulta, se
// usan estos datos reales como respaldo.
export type CompanyInfo = {
  companyName: string
  address: string
  phone: string
  email: string
}

const DEFAULT_COMPANY_INFO: CompanyInfo = {
  companyName: 'BrightCoat Painting & Remodeling, LLC',
  address: 'PO Box 40006, Austin, TX 78704-0001',
  phone: '+1 (512) 541-9987',
  email: 'brightcoatpainting@gmail.com',
}

export const fetchCompanyInfoForPdf = async (): Promise<CompanyInfo> => {
  try {
    const settings = await fetchCompanySettings()
    if (!settings) return DEFAULT_COMPANY_INFO
    return {
      companyName: settings.companyName || DEFAULT_COMPANY_INFO.companyName,
      address: settings.address || DEFAULT_COMPANY_INFO.address,
      phone: settings.phone || DEFAULT_COMPANY_INFO.phone,
      email: settings.email || DEFAULT_COMPANY_INFO.email,
    }
  } catch {
    return DEFAULT_COMPANY_INFO
  }
}
