// ---------------------------------------------------------------------------
// Supabase (PostgrestError) y otros errores que vienen de la base de datos
// NO son instancias de `Error` — son objetos planos con un campo `message`
// (junto con `code`, `details`, `hint`). El patrón `err instanceof Error ?
// err.message : fallback`, usado en toda la app, deja pasar esos casos y
// termina mostrando el mensaje genérico en vez del error real de la base de
// datos (por ejemplo, una columna que no existe o una restricción violada).
// Esta función cubre ambos casos: Error de verdad, y cualquier objeto con
// un `message` de tipo string.
// ---------------------------------------------------------------------------

export const getErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}
