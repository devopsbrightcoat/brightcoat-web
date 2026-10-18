// Utilidades compartidas por los generadores de PDF (Planillas, Estimados) —
// cargar el logo de la empresa como data URL para doc.addImage, ya que
// jsPDF no puede usar una URL directamente, necesita los bytes en base64.

export const LOGO_URL = '/brightcoat-logo.png'

// Proporción real del archivo public/brightcoat-logo.png (919x615) — se usa
// para no deformar el logo al escalarlo en el encabezado del PDF.
export const LOGO_ASPECT_RATIO = 615 / 919

// El logo tiene el texto "BRIGHTCOAT" en plateado: se diseñó para verse
// sobre fondo oscuro (como el sidebar, bg-brand-900) y casi no se distingue
// sobre blanco. En los PDF le ponemos detrás una placa de este mismo navy
// de marca para que resalte igual que en la app.
export const LOGO_PLATE_COLOR = [0x0b, 0x1c, 0x38] as const

export const loadImageAsDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url)
  const blob = await response.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
