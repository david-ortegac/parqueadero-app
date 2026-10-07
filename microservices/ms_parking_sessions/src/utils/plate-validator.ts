export class ColombianPlateValidator {
  private static readonly CAR_REGEX = /^[A-Z]{3}\d{3}$/;
  private static readonly MOTO_5_REGEX = /^[A-Z]{3}\d{2}$/;
  private static readonly MOTO_6_REGEX = /^[A-Z]{3}\d{2}[A-Z]$/;

  static normalize(plate: string): string {
    if (!plate) return '';
    return plate
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '')
      .replace(/[^A-Z0-9]/g, '');
  }

  static isValid(normalizedPlate: string, vehicleClass: 'car' | 'motorcycle'): boolean {
    if (!normalizedPlate || !/^[A-Z0-9]+$/.test(normalizedPlate)) {
      return false;
    }

    if (vehicleClass === 'car') {
      return this.CAR_REGEX.test(normalizedPlate);
    }

    if (vehicleClass === 'motorcycle') {
      if (normalizedPlate.length === 5) {
        return this.MOTO_5_REGEX.test(normalizedPlate);
      }
      if (normalizedPlate.length === 6) {
        return this.MOTO_6_REGEX.test(normalizedPlate);
      }
      return false;
    }

    return false;
  }

  static isValidAnyClass(normalizedPlate: string): boolean {
    return this.isValid(normalizedPlate, 'car') || this.isValid(normalizedPlate, 'motorcycle');
  }

  static messageFor(vehicleClass: 'car' | 'motorcycle'): string {
    if (vehicleClass === 'car') {
      return 'La placa de carro debe tener 6 caracteres: 3 letras y 3 números (ej. ABC123).';
    }
    if (vehicleClass === 'motorcycle') {
      return 'La placa de moto debe tener 5 caracteres (ej. ABC12) o 6 (ej. ABC12A): 3 letras y 2 números, opcionalmente una letra al final.';
    }
    return 'Formato de placa no válido.';
  }
}
