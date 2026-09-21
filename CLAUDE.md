# ops-web — notas para Claude

## Validar TypeScript

El `tsconfig.json` raíz es un archivo "solution style" (`"files": []` +
`"references"`) — `npx tsc --noEmit` (sin `-p`) lo lee a él, ve una lista de
archivos vacía y "pasa" sin revisar nada, sin importar los errores reales que
haya en `src/`. Para validar de verdad:

```
npx tsc --noEmit -p tsconfig.app.json
```

(`tsconfig.node.json` cubre `vite.config.ts` y similares, normalmente no hace
falta re-chequearlo salvo que se toque esa configuración).

## Convenciones de UI

- Los controles de filtro (quincena/rango de fechas, etc.) van siempre en la
  misma fila que el buscador (search bar) más cercano, nunca en una fila
  propia ni como panel siempre visible — se colapsan detrás de un botón
  compacto (ícono + resumen del valor actual) que abre un panel/modal al
  tocarlo. Ver Planillas.tsx como referencia.
- En cualquier chart de recharts (LineChart o BarChart) cuyo eje Y muestre
  montos en dólares, siempre hay que abreviar las etiquetas del eje Y a
  formato "14k" (< 1000 se muestra tal cual, redondeado; ≥ 1000 se divide
  entre 1000 con 1 decimal + "k") para que las cifras altas no se corten ni
  empujen el gráfico. Se hace con un `tickFormatter` en el `<YAxis>` — ver
  `formatYAxisLabel` en Dashboard.tsx, ReportesFinanciero.tsx o
  ReportesGastos.tsx como referencia (se duplica por archivo, igual que la
  función `currency` local de cada página). Los charts que muestran
  cantidades de trabajos (no dólares), como en ReportesOperaciones.tsx, NO
  necesitan esta abreviación — normalmente no llegan a cifras altas.
