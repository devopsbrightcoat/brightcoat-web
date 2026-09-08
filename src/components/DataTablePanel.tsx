import { flexRender, type Table } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Pagination } from './Pagination'

// ---------------------------------------------------------------------------
// Panel genérico para tablas ordenables/paginadas (tanstack/react-table).
// Reutilizado por Cobros, Gastos y Planillas para no repetir el mismo
// markup de encabezado ordenable + estados de carga/error/vacío + paginación.
// ---------------------------------------------------------------------------

type DataTablePanelProps<T> = {
  title: string
  table: Table<T>
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  state: 'loading' | 'error' | 'empty' | 'ready'
  message?: string
}

const SortIcon = ({ direction }: { direction: false | 'asc' | 'desc' }) =>
  direction === 'asc' ? (
    <ArrowUp className="h-3 w-3" />
  ) : direction === 'desc' ? (
    <ArrowDown className="h-3 w-3" />
  ) : (
    <ArrowUpDown className="h-3 w-3 opacity-40" />
  )

export function DataTablePanel<T>({ title, table, page, totalPages, onPageChange, state, message }: DataTablePanelProps<T>) {
  return (
    <div className="mx-8 mt-6 mb-6 flex flex-1 min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-surface-alt">
      <div className="border-b border-white/10 px-5 py-3.5">
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      {state !== 'ready' ? (
        <p className={`px-5 py-6 text-sm ${state === 'error' ? 'text-red-400' : 'text-ink-500'}`}>{message}</p>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-auto">
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
                  <tr key={row.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
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
