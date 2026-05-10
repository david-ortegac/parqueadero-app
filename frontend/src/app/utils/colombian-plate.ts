/** Placa operador/admin: carro 6 caracteres (LLLNNN); moto 5 (LLLNN) o 6 (LLLNNL). */

const CAR_PLATE = /^[A-Z]{3}\d{3}$/;

const MOTO_PLATE_5 = /^[A-Z]{3}\d{2}$/;

const MOTO_PLATE_6 = /^[A-Z]{3}\d{2}[A-Z]$/;

export type VehicleClassPlate = 'car' | 'motorcycle';

/** Una sola caja: mayúsculas, solo A–Z y 0–9, máximo 6 caracteres. */
export function sanitizeOperatorPlateField(raw: string): string {
  return raw
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

export function plateFormatHint(vehicleClass: VehicleClassPlate): string {
  if (vehicleClass === 'car') {
    return 'Carro: 6 caracteres, 3 letras y 3 números (ej. ABC123). El tipo se elige solo cuando la placa lo deja claro.';
  }
  return 'Moto: 5 caracteres (ej. ABC12) o 6 (ej. ABC12A). El tipo se elige solo cuando la placa lo deja claro.';
}

/**
 * Si la placa ya encaja solo en carro o solo en moto, devuelve ese tipo; si no, `null`.
 * (Con menos de 5 caracteres no se infiere.)
 */
export function inferVehicleClassFromPlate(plate: string): VehicleClassPlate | null {
  const p = sanitizeOperatorPlateField(plate);
  if (p.length === 5 && MOTO_PLATE_5.test(p)) {
    return 'motorcycle';
  }
  if (p.length === 6) {
    if (CAR_PLATE.test(p)) {
      return 'car';
    }
    if (MOTO_PLATE_6.test(p)) {
      return 'motorcycle';
    }
  }
  return null;
}

/** `null` = sin error de formato (vacío no se considera aquí; validar requerido aparte). */
export function validateOperatorPlate(plate: string, vehicleClass: VehicleClassPlate): string | null {
  const p = plate.trim();
  if (p.length === 0) {
    return null;
  }
  if (!/^[A-Z0-9]+$/.test(p)) {
    return 'Solo se permiten letras y números, sin espacios.';
  }
  if (vehicleClass === 'car') {
    if (p.length !== 6) {
      return 'Carro: la placa debe tener 6 caracteres (3 letras y 3 números).';
    }
    return CAR_PLATE.test(p)
      ? null
      : 'Carro: los 3 primeros caracteres deben ser letras y los 3 últimos, números (ej. ABC123).';
  }

  if (p.length > 6) {
    return 'Moto: usa 5 caracteres (ABC12) o 6 (ABC12A).';
  }

  if (p.length > 0 && p.length < 5) {
    return 'Moto: completa la placa (ej. ABC12 o ABC12A).';
  }
  if (p.length === 5) {
    return MOTO_PLATE_5.test(p)
      ? null
      : 'Moto: tras las 3 letras deben ir 2 números (ej. ABC12).';
  }
  if (p.length === 6) {
    return MOTO_PLATE_6.test(p)
      ? null
      : 'Moto: formato ABC12A (3 letras, 2 números y 1 letra al final).';
  }
  return 'Moto: usa 5 caracteres (ABC12) o 6 (ABC12A).';
}
