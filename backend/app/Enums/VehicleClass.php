<?php

declare(strict_types=1);

namespace App\Enums;

enum VehicleClass: string
{
    case Car = 'car';
    case Motorcycle = 'motorcycle';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
