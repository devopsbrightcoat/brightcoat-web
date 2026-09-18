import { useCallback, useEffect, useRef, useState } from 'react'
import { getErrorMessage } from './errors'

const isClockSkewError = (err: unknown): boolean => /issued at future/i.test(getErrorMessage(err, ''))

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const fetchWithRetry = async <T>(fetcher: () => Promise<T>, retriesLeft = 2, delayMs = 500): Promise<T> => {
  try {
    return await fetcher()
  } catch (err) {
    if (retriesLeft > 0 && isClockSkewError(err)) {
      await wait(delayMs)
      return fetchWithRetry(fetcher, retriesLeft - 1, delayMs)
    }
    throw err
  }
}

type QueryState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

type QueryResult<T> = QueryState<T> & {
  refreshing: boolean
  refetch: () => void
}

// `refetch` se agregó para que ReferenceDataContext (properties/employees/
// serviceTypes compartidos, ver contexts/ReferenceDataContext.tsx) pueda
// refrescar el cache después de una mutación sin depender de un
// `refreshKey` local por pantalla. Mismo shape que
// ops-mobile/src/lib/useSupabaseQuery.ts (con el mismo retry por clock
// skew) — antes esta versión no tenía refetch/refreshing.
export const useSupabaseQuery = <T>(fetcher: () => Promise<T>, deps: unknown[]): QueryResult<T> => {
  const [state, setState] = useState<QueryState<T>>({ data: null, loading: true, error: null })
  const [refreshing, setRefreshing] = useState(false)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let active = true
    setState({ data: null, loading: true, error: null })

    fetchWithRetry(fetcherRef.current)
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

  const refetch = useCallback(() => {
    setRefreshing(true)
    fetchWithRetry(fetcherRef.current)
      .then((data) => {
        if (mountedRef.current) setState({ data, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (!mountedRef.current) return
        const message = getErrorMessage(err, 'Error al cargar los datos.')
        setState((prev) => ({ ...prev, loading: false, error: message }))
      })
      .finally(() => {
        if (mountedRef.current) setRefreshing(false)
      })
  }, [])

  return { ...state, refreshing, refetch }
}
