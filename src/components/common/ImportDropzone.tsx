import { useRef, useState } from 'react'
import { AlertTriangle, Upload } from 'lucide-react'

// ---------------------------------------------------------------------------
// Zona de arrastrar-y-soltar reutilizada por los modales de importación
// (ImportChargesModal, ImportExpensesModal). Solo se encarga de recibir el
// archivo; cada modal decide qué hacer con él.
// ---------------------------------------------------------------------------

type ImportDropzoneProps = {
  onFile: (file: File) => void
  acceptHint: string
  parseError: string | null
}

export const ImportDropzone = ({ onFile, acceptHint, parseError }: ImportDropzoneProps) => {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) onFile(file)
      }}
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
        dragOver ? 'border-gold-500 bg-gold-500/5' : 'border-white/15 bg-surface'
      }`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
        <Upload className="h-5 w-5 text-ink-400" />
      </span>
      <p className="text-sm font-medium text-ink-200">Arrastra tu archivo aquí, o haz clic para elegirlo</p>
      <p className="text-xs text-ink-500">{acceptHint}</p>
      <p className="max-w-md text-xs text-ink-500">
        Puedes subir el mismo archivo más de una vez sin duplicar datos — las filas que ya se hayan importado antes
        se detectan automáticamente y se omiten.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-2 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-brand-900 transition hover:bg-gold-400"
      >
        Elegir archivo
      </button>
      {parseError && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4" /> {parseError}
        </p>
      )}
    </div>
  )
}
