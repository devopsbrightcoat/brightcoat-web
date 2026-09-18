import { useEffect, useRef } from 'react'
import { flexRender, type Table } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Pagination } from './Pagination'

type DataTablePanelProps<T> = {
  title: string
  table: Table<T>
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  state: 'loading' | 'error' | 'empty' | 'ready'
  message?: string
  onRowClick?: (row: T) => void
}

const SortIcon = ({ direction }: { direction: false | 'asc' | 'desc' }) =>
  direction === 'asc' ? (
    <ArrowUp className="h-3 w-3" />
  ) : direction === 'desc' ? (
    <ArrowDown className="h-3 w-3" />
  ) : (
    <ArrowUpDown className="h-3 w-3 opacity-40" />
  )

export function DataTablePanel<T>({
  title,
  table,
  page,
  totalPages,
  onPageChange,
  state,
  message,
  onRowClick,
}: DataTablePanelProps<T>) {
  // Al cambiar de página, la tabla puede quedar scrolleada hacia abajo (su
  // propio contenedor con scroll interno, o la página completa si no lo
  // tiene) y las primeras filas de la página nueva quedan fuera de vista —
  // dando la falsa impresión de que se saltaron registros. Volvemos a subir
  // el scroll cada vez que cambia `page`.
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollBodyRef = useRef<HTMLDivElement>(null)
  // Guardamos la página anterior para subir el scroll solo cuando `page`
  // realmente cambia (clic en Siguiente/Anterior), nunca en el montaje
  // inicial del panel (p. ej. al generar el reporte por primera vez) ni en
  // el doble efecto que React StrictMode dispara en desarrollo — comparar
  // contra el valor previo es inmune a eso, a diferencia de una bandera de
  // "primera vez" que StrictMode puede hacer disparar de más.
  const previousPageRef = useRef(page)

  useEffect(() => {
    if (previousPageRef.current !== page) {
      if (scrollBodyRef.current) scrollBodyRef.current.scrollTop = 0
      panelRef.current?.scrollIntoView({ block: 'start' })
    }
    previousPageRef.current = page
  }, [page])

  return (
    <div ref={panelRef} className="mx-8 mt-6 mb-6 flex flex-1 min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-surface-alt">
      <div className="border-b border-white/10 px-5 py-3.5">
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      {state !== 'ready' ? (
        <p className={`px-5 py-6 text-sm ${state === 'error' ? 'text-red-400' : 'text-ink-500'}`}>{message}</p>
      ) : (
        <>
          <div ref={scrollBodyRef} className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-surface-alt">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="border-b border-white/5 text-xs uppercase tracking-wide text-ink-500"
                  >
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-5 py-2.5 font-medium">
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1.5 hover:text-ink-300"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIcon direction={header.column.getIsSorted()} />
                        </button>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={`border-b border-white/5 last:border-0 hover:bg-white/5 ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-5 py-3 text-ink-200">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
        </>
      )}
    </div>
  )
}
