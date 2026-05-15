/** Utilidades de formato de moneda, fechas y tiempo para la UI del parqueadero. */

/** Formatea un número como pesos colombianos sin símbolo (separadores es-CO). */
export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n);
}

/** Formatea un número como pesos colombianos con símbolo COP (es-CO). */
export function formatCop(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Formatea una fecha ISO para recibos (dd/MM/yyyy HH:mm, zona Colombia). */
export function formatReceiptDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Etiqueta de tiempo transcurrido desde `enteredAt` hasta `nowMs`.
 * Formato: "X h Y min" | "X min Y s" | "X s"
 */
export function parkingElapsedLabel(enteredAt: string, nowMs: number): string {
  const ms = Math.max(0, nowMs - new Date(enteredAt).getTime());
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h} h ${m} min`;
  }
  if (m > 0) {
    return `${m} min ${s} s`;
  }
  return `${s} s`;
}

/** Convierte una fecha a string YYYY-MM-DD en hora local. */
export function isoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
