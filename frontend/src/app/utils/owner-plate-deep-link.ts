import { environment } from '../../environments/environment';

function stripTrailingSlashes(base: string): string {
  return base.replace(/\/+$/, '');
}

/**
 * Origen público de la PWA (sin barra final).
 * Configura `publicAppBaseUrl` en environment para QR útiles fuera de localhost
 * (p. ej. impresión desde Capacitor o red local).
 */
export function resolvePublicAppOrigin(): string {
  const configured = environment.publicAppBaseUrl?.trim();
  if (configured && configured.length > 0) {
    return stripTrailingSlashes(configured);
  }
  if (typeof globalThis !== 'undefined' && 'location' in globalThis) {
    const loc = (globalThis as { location?: { origin?: string } }).location;
    if (loc?.origin) {
      return stripTrailingSlashes(loc.origin);
    }
  }
  return '';
}

/** Ruta Parqueo (tab 2) con placa en query: filtro sesiones activas o acordeón del propietario. */
export function buildOwnerProfilePlateUrl(plateRaw: string): string {
  const plate = plateRaw.trim().toUpperCase().replace(/\s+/g, '');
  const origin = resolvePublicAppOrigin();
  const path = '/tabs/tab2';
  const qs = plate.length > 0 ? `?plate=${encodeURIComponent(plate)}` : '';
  return `${origin}${path}${qs}`;
}
