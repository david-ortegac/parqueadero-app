<?php

declare(strict_types=1);

namespace App\Support;

final class ColombianPlateValidator
{
    private const CAR = '/^[A-Z]{3}\d{3}$/';

    private const MOTO_5 = '/^[A-Z]{3}\d{2}$/';

    private const MOTO_6 = '/^[A-Z]{3}\d{2}[A-Z]$/';

    public static function normalize(string $plate): string
    {
        $t = strtoupper(preg_replace('/\s+/', '', $plate) ?? '');

        return preg_replace('/[^A-Z0-9]/', '', $t) ?? '';
    }

    public static function isValid(string $normalizedPlate, string $vehicleClass): bool
    {
        if ($normalizedPlate === '' || ! preg_match('/^[A-Z0-9]+$/', $normalizedPlate)) {
            return false;
        }

        if ($vehicleClass === 'car') {
            return (bool) preg_match(self::CAR, $normalizedPlate);
        }

        if ($vehicleClass === 'motorcycle') {
            $len = strlen($normalizedPlate);

            if ($len === 5) {
                return (bool) preg_match(self::MOTO_5, $normalizedPlate);
            }

            if ($len === 6) {
                return (bool) preg_match(self::MOTO_6, $normalizedPlate);
            }

            return false;
        }

        return false;
    }

    public static function messageFor(string $vehicleClass): string
    {
        return match ($vehicleClass) {
            'car' => 'La placa de carro debe tener 6 caracteres: 3 letras y 3 números (ej. ABC123).',
            'motorcycle' => 'La placa de moto debe tener 5 caracteres (ej. ABC12) o 6 (ej. ABC12A): 3 letras y 2 números, opcionalmente una letra al final.',
            default => 'Formato de placa no válido.',
        };
    }
}
