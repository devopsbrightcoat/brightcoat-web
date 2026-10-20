type FixedChargeCheckboxProps = {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
}

// Marca la planilla como de un servicio de cobro fijo (ej. limpieza de
// oficina que se cobra una vez al mes en Cobros): no lleva Cobro propio y
// no cuenta como pendiente de cobro.
export const FixedChargeCheckbox = ({ id, checked, onChange }: FixedChargeCheckboxProps) => (
  <div className="rounded-lg border border-white/10 bg-surface px-3 py-2.5">
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm text-ink-200">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-white/20 bg-surface-alt accent-gold-500"
      />
      Servicio de cobro fijo (finalizada)
    </label>
    <p className="mt-1 pl-6 text-xs text-ink-500">
      Ya se cobra en el cobro fijo mensual — no lleva Cobro propio ni queda como pendiente de cobro.
    </p>
  </div>
)
