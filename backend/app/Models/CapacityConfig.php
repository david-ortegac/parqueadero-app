<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class CapacityConfig extends Model
{
    protected $fillable = [
        'vehicle_class',
        'max_slots',
    ];

    protected function casts(): array
    {
        return [
            'max_slots' => 'integer',
        ];
    }
}
