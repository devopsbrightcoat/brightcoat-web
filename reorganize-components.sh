#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Reorganiza src/components/ en subcarpetas por dominio: common/, cobros/,
# gastos/, pagos/, horarios/, empleados/, propiedades/, servicios/.
#
# Correr desde la raíz de ops-web (donde está package.json):
#   chmod +x reorganize-components.sh
#   ./reorganize-components.sh
#
# Usa `git mv` para los archivos que ya están en git (conserva su historial)
# y `mv` normal para los que todavía no se han agregado (por ejemplo
# FilterPanel.tsx, si no lo has comiteado aún) — se detecta solo.
#
# IMPORTANTE: después de correr esto el proyecto NO va a compilar todavía.
# Los imports que apuntan a las rutas viejas (ej. '../components/Modal')
# quedan rotos hasta que yo los actualice — avísame en cuanto termines de
# correrlo para mandarte esa parte.
# ---------------------------------------------------------------------------
set -euo pipefail

if [ ! -f package.json ] || [ ! -d src/components ]; then
  echo "Corre este script desde la raíz de ops-web (donde está package.json)." >&2
  exit 1
fi

move_file() {
  local src="$1" dst="$2"
  if git ls-files --error-unmatch "$src" > /dev/null 2>&1; then
    git mv "$src" "$dst"
  else
    mv "$src" "$dst"
  fi
}

cd src/components
mkdir -p common cobros gastos pagos horarios empleados propiedades servicios

# common/ — piezas genéricas compartidas por varias pantallas
move_file DataTablePanel.tsx    common/DataTablePanel.tsx
move_file DateRangeSelect.tsx   common/DateRangeSelect.tsx
move_file FilterPanel.tsx       common/FilterPanel.tsx
move_file ImportDropzone.tsx    common/ImportDropzone.tsx
move_file MockBanner.tsx        common/MockBanner.tsx
move_file Modal.tsx             common/Modal.tsx
move_file PageHeader.tsx        common/PageHeader.tsx
move_file Pagination.tsx        common/Pagination.tsx
move_file StatCard.tsx          common/StatCard.tsx
move_file StatusPill.tsx        common/StatusPill.tsx

# cobros/ — pantalla Cobros
move_file ChargeDetailModal.tsx   cobros/ChargeDetailModal.tsx
move_file ChargeFiltersModal.tsx  cobros/ChargeFiltersModal.tsx
move_file ChargeInvoiceModal.tsx  cobros/ChargeInvoiceModal.tsx
move_file ImportChargesModal.tsx  cobros/ImportChargesModal.tsx

# gastos/ — pantalla Gastos
move_file AddExpenseModal.tsx     gastos/AddExpenseModal.tsx
move_file EditExpenseModal.tsx    gastos/EditExpenseModal.tsx
move_file ExpenseDetailModal.tsx  gastos/ExpenseDetailModal.tsx
move_file ExpenseFiltersModal.tsx gastos/ExpenseFiltersModal.tsx
move_file ImportExpensesModal.tsx gastos/ImportExpensesModal.tsx

# pagos/ — pantalla Planillas (pago de mano de obra)
move_file AddPayrollEntryModal.tsx    pagos/AddPayrollEntryModal.tsx
move_file EditPayrollEntryModal.tsx   pagos/EditPayrollEntryModal.tsx
move_file PayrollEntryDetailModal.tsx pagos/PayrollEntryDetailModal.tsx
move_file PayrollFiltersModal.tsx     pagos/PayrollFiltersModal.tsx
move_file ImportPayrollModal.tsx      pagos/ImportPayrollModal.tsx

# horarios/ — pantalla Horarios
move_file AddScheduleModal.tsx    horarios/AddScheduleModal.tsx
move_file EditScheduleModal.tsx   horarios/EditScheduleModal.tsx
move_file ScheduleActionModal.tsx horarios/ScheduleActionModal.tsx
move_file ScheduleDetailModal.tsx horarios/ScheduleDetailModal.tsx
move_file ScheduleFiltersModal.tsx horarios/ScheduleFiltersModal.tsx

# empleados/ — pantalla Empleados
move_file AddEmployeeModal.tsx  empleados/AddEmployeeModal.tsx
move_file EditEmployeeModal.tsx empleados/EditEmployeeModal.tsx

# propiedades/ — pantalla Propiedades
move_file AddPropertyModal.tsx  propiedades/AddPropertyModal.tsx
move_file EditPropertyModal.tsx propiedades/EditPropertyModal.tsx

# servicios/ — Configuración > Servicios
move_file AddServiceTypeModal.tsx  servicios/AddServiceTypeModal.tsx
move_file EditServiceTypeModal.tsx servicios/EditServiceTypeModal.tsx

cd - > /dev/null

echo ""
echo "Listo — archivos movidos a src/components/{common,cobros,gastos,pagos,horarios,empleados,propiedades,servicios}/"
echo "Avísame en el chat para mandarte los imports ya corregidos."
