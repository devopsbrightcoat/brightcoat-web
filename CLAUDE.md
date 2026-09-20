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
