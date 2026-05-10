<?php

declare(strict_types=1);

namespace App\Enums;

enum BillingMode: string
{
    case Minute = 'minute';
    case Hour = 'hour';
    case Day = 'day';
    case Week = 'week';
    case Month = 'month';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
