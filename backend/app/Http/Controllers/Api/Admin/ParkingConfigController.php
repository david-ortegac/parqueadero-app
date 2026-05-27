<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Admin;

use App\Enums\VehicleClass;
use App\Http\Controllers\Controller;
use App\Models\CapacityConfig;
use App\Models\ParkingSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

final class ParkingConfigController extends Controller
{
    public function show(): JsonResponse
    {
        $name = null;
        $address = null;
        $carCapacity = null;
        $motoCapacity = null;

        try {
            if (Schema::hasTable('parking_settings')) {
                $settings = ParkingSetting::query()->pluck('value', 'key');
                $name = $settings->get('parking_name');
                $address = $settings->get('parking_address');
            }
        } catch (\Throwable $e) {
            Log::warning("Error al consultar la tabla parking_settings: " . $e->getMessage());
        }

        try {
            if (Schema::hasTable('capacity_configs')) {
                $carCapacity = CapacityConfig::query()
                    ->where('vehicle_class', VehicleClass::Car->value)
                    ->value('max_slots');
                    
                $motoCapacity = CapacityConfig::query()
                    ->where('vehicle_class', VehicleClass::Motorcycle->value)
                    ->value('max_slots');
            }
        } catch (\Throwable $e) {
            Log::warning("Error al consultar la tabla capacity_configs: " . $e->getMessage());
        }

        return response()->json([
            'name' => $name,
            'address' => $address,
            'car_capacity' => $carCapacity,
            'motorcycle_capacity' => $motoCapacity,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'car_capacity' => ['nullable', 'integer', 'min:0'],
            'motorcycle_capacity' => ['nullable', 'integer', 'min:0'],
        ]);

        try {
            if (array_key_exists('name', $data)) {
                ParkingSetting::query()->updateOrCreate(
                    ['key' => 'parking_name'],
                    ['value' => $data['name']]
                );
            }

            if (array_key_exists('address', $data)) {
                ParkingSetting::query()->updateOrCreate(
                    ['key' => 'parking_address'],
                    ['value' => $data['address']]
                );
            }

            if (array_key_exists('car_capacity', $data)) {
                if ($data['car_capacity'] === null) {
                    CapacityConfig::query()->where('vehicle_class', VehicleClass::Car->value)->delete();
                } else {
                    CapacityConfig::query()->updateOrCreate(
                        ['vehicle_class' => VehicleClass::Car->value],
                        ['max_slots' => $data['car_capacity']]
                    );
                }
            }

            if (array_key_exists('motorcycle_capacity', $data)) {
                if ($data['motorcycle_capacity'] === null) {
                    CapacityConfig::query()->where('vehicle_class', VehicleClass::Motorcycle->value)->delete();
                } else {
                    CapacityConfig::query()->updateOrCreate(
                        ['vehicle_class' => VehicleClass::Motorcycle->value],
                        ['max_slots' => $data['motorcycle_capacity']]
                    );
                }
            }
        } catch (\Throwable $e) {
            Log::error("Error al actualizar la configuración del parqueadero: " . $e->getMessage());
            return response()->json([
                'message' => 'No se pudo guardar la configuración. Intente de nuevo o contacte al administrador.',
            ], 500);
        }

        return $this->show();
    }
}
