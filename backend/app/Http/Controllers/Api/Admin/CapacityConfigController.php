<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Admin;

use App\Enums\VehicleClass;
use App\Http\Controllers\Controller;
use App\Models\CapacityConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CapacityConfigController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(CapacityConfig::query()->orderBy('vehicle_class')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'vehicle_class' => ['required', 'in:'.implode(',', VehicleClass::values())],
            'max_slots' => ['required', 'integer', 'min:1'],
        ]);

        $row = CapacityConfig::query()->updateOrCreate(
            ['vehicle_class' => $data['vehicle_class']],
            ['max_slots' => $data['max_slots']]
        );

        return response()->json($row, 201);
    }
}
