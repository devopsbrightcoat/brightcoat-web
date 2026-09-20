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
