import { useEffect, useState } from 'react'

type QueryState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

// Hook chico para no repetir el mismo useEffect/useState de "cargar datos de
// Supabase" en cada página. No usa cache ni revalidación — para el tamaño de
// esta app (un puñado de páginas, datos que no cambian todo el tiempo) un
// fetch simple por página es suficiente.
export const useSupabaseQuery = <T>(fetcher: () => Promise<T>, deps: unknown[]): QueryState<T> => {
  const [state, setState] = useState<QueryState<T>>({ data: null, loading: true, error: null })

  useEffect(() => {
    let active = true
    setState({ data: null, loading: true, error: null })

    fetcher()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (!active) return
        const message = err instanceof Error ? err.message : 'Error al cargar los datos.'
        setState({ data: null, loading: false, error: message })
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
