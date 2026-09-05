import { useMemo, useState } from 'react'

// Pagina un arreglo en memoria. Si la lista se filtra/recarga y la página
// que estaba seleccionada queda fuera de rango, se recorta durante el
// render (sin useEffect) a la última página válida.
export const usePagination = <T>(items: T[], pageSize = 15) => {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, totalPages)

  const pageItems = useMemo(
    () => items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [items, currentPage, pageSize],
  )

  return { page: currentPage, setPage, totalPages, pageItems }
}
