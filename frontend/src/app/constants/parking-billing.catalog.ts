import { Rate } from '../services/parking-api.service';

/**
 * Catálogo único de cobros (alineado con backend: VehicleClass, BillingMode).
 * Cambiar orden o etiquetas aquí para propagar a tarifas admin, check-in, textos.
 */

/** Fecha y hora mostradas en Colombia (API puede enviar UTC; el pipe `date` usa esta zona). */
export const PARKING_DISPLAY_TIMEZONE = 'America/Bogota';
export const PARKING_DISPLAY_LOCALE = 'es-CO';
export const PARKING_DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';

export const VEHICLE_CLASSES = ['car', 'motorcycle'] as const;
export type VehicleClassId = (typeof VEHICLE_CLASSES)[number];

export const BILLING_MODES = ['minute', 'hour', 'day', 'week', 'month'] as const;
export type BillingModeId = (typeof BILLING_MODES)[number];

export const VEHICLE_CLASS_LABEL: Record<VehicleClassId, string> = {
  car: 'Carros',
  motorcycle: 'Motos',
};

/** Etiqueta corta (check-in, tablas). */
export const VEHICLE_CLASS_LABEL_SHORT: Record<VehicleClassId, string> = {
  car: 'Carro',
  motorcycle: 'Moto',
};

export const BILLING_MODE_LABEL: Record<BillingModeId, string> = {
  minute: 'Minuto',
  hour: 'Hora',
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
};

/** Texto para tarifa unitaria (ej. "por minuto"). */
export const BILLING_MODE_RATE_SUFFIX: Record<BillingModeId, string> = {
  minute: 'por minuto',
  hour: 'por hora',
  day: 'por día',
  week: 'por semana',
  month: 'por mes',
};

export function billingRateUnitSuffix(mode: string): string {
  const id = mode as BillingModeId;
  return BILLING_MODE_RATE_SUFFIX[id] ?? '';
}

/** Selectores Ionic / Prime (Parqueo tab). */
export const VEHICLE_OPTIONS: { label: string; value: VehicleClassId }[] = VEHICLE_CLASSES.map((value) => ({
  label: VEHICLE_CLASS_LABEL_SHORT[value],
  value,
}));

export const BILLING_OPTIONS: { label: string; value: BillingModeId }[] = BILLING_MODES.map((value) => ({
  label: BILLING_MODE_LABEL[value],
  value,
}));

/** Colores gráfico ocupación (mismo criterio que --pp-chart-* en theme). */
export const OCCUPANCY_CHART_COLORS = {
  car: { fill: '#2563eb', hover: '#1d4ed8' },
  motorcycle: { fill: '#f97316', hover: '#ea580c' },
} as const;

export const OCCUPANCY_CHART_LABELS: [string, string] = ['Carros', 'Motos'];

export function labelVehicleClass(value: string): string {
  return value in VEHICLE_CLASS_LABEL ? VEHICLE_CLASS_LABEL[value as VehicleClassId] : value;
}

export function labelVehicleClassShort(value: string): string {
  return value in VEHICLE_CLASS_LABEL_SHORT
    ? VEHICLE_CLASS_LABEL_SHORT[value as VehicleClassId]
    : value;
}

export function labelBillingMode(value: string): string {
  return value in BILLING_MODE_LABEL ? BILLING_MODE_LABEL[value as BillingModeId] : value;
}

function sortRatesByBillingMode(rates: Rate[]): Rate[] {
  const order = new Map(BILLING_MODES.map((m, i) => [m, i]));
  return [...rates].sort(
    (a, b) =>
      (order.get(a.billing_mode as BillingModeId) ?? 99) -
      (order.get(b.billing_mode as BillingModeId) ?? 99),
  );
}

/** Tarifas admin agrupadas por tipo de vehículo y ordenadas por modalidad. */
export function groupRatesByVehicleClass(rates: Rate[]): {
  vehicleClass: VehicleClassId;
  sectionTitle: string;
  rates: Rate[];
}[] {
  return VEHICLE_CLASSES.map((vehicleClass) => ({
    vehicleClass,
    sectionTitle: VEHICLE_CLASS_LABEL[vehicleClass],
    rates: sortRatesByBillingMode(rates.filter((r) => r.vehicle_class === vehicleClass)),
  })).filter((g) => g.rates.length > 0);
}
