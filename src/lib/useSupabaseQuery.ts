import { useEffect, useState } from 'react'
import { getErrorMessage } from './errors'

type QueryState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

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
        const message = getErrorMessage(err, 'Error al cargar los datos.')
        setState({ data: null, loading: false, error: message })
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
