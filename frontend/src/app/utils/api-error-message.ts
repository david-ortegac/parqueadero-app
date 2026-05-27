import { HttpErrorResponse } from '@angular/common/http';

const GENERIC_MESSAGE = 'Ocurrió un error. Intente de nuevo más tarde.';

/**
 * Mensaje seguro para mostrar al usuario (evita filtrar detalles internos del API).
 */
export function apiErrorMessage(err: unknown, fallback = GENERIC_MESSAGE): string {
  if (!(err instanceof HttpErrorResponse)) {
    return fallback;
  }
  if (err.status === 0) {
    return 'No se pudo conectar con el servidor. Verifique su conexión.';
  }
  if (err.status >= 500) {
    return GENERIC_MESSAGE;
  }
  const body = err.error as { message?: string; errors?: Record<string, string[]> } | null;
  if (body?.errors) {
    const first = Object.values(body.errors).flat()[0];
    if (typeof first === 'string' && first.length > 0 && first.length <= 200) {
      return first;
    }
  }
  if (typeof body?.message === 'string' && body.message.length > 0 && body.message.length <= 200) {
    return body.message;
  }
  return fallback;
}
