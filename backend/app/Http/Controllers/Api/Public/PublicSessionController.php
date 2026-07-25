<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Public;

use App\Enums\BillingMode;
use App\Enums\VehicleClass;
use App\Http\Controllers\Controller;
use App\Models\CapacityConfig;
use App\Models\ParkingSession;
use App\Models\Rate;
use App\Models\Vehicle;
use App\Services\ParkingBillingService;
use App\Support\ColombianPlateValidator;
use Illuminate\Http\JsonResponse;

final class PublicSessionController extends Controller
{
    public function __construct(
        private readonly ParkingBillingService $billing,
    ) {}

    public function occupancy(): JsonResponse
    {
        return response()->json([
            'car' => $this->occupancyForClass(VehicleClass::Car),
            'motorcycle' => $this->occupancyForClass(VehicleClass::Motorcycle),
        ]);
    }

    public function byPlate(string $plate): JsonResponse
    {
        $normalized = ColombianPlateValidator::normalize($plate);

        if ($normalized === '' || ! ColombianPlateValidator::isValidAnyClass($normalized)) {
            return response()->json([
                'message' => 'Formato de placa no válido. Usa el formato colombiano (ej. ABC123 o ABC12A).',
            ], 422);
        }

        $vehicle = Vehicle::query()->where('plate', $normalized)->first();

        if ($vehicle === null) {
            return response()->json([
                'plate' => $normalized,
                'is_parked' => false,
            ]);
        }

        /** @var ParkingSession|null $session */
        $session = ParkingSession::query()
            ->where('vehicle_id', $vehicle->id)
            ->where('status', 'active')
            ->orderByDesc('entered_at')
            ->first();

        if ($session === null) {
            return response()->json([
                'plate' => $normalized,
                'is_parked' => false,
                'vehicle_class' => $vehicle->vehicle_class,
            ]);
        }

        $session->setRelation('vehicle', $vehicle);

        $mode = BillingMode::tryFrom($session->billing_mode);
        $amountStored = (string) $session->amount_due;
        $amountLive = $amountStored;
        $usesLiveEstimate = false;

        if ($mode !== null && in_array($mode, [BillingMode::Minute, BillingMode::Hour, BillingMode::Day], true)) {
            $amountLive = $this->billing->calculateCheckoutAmount($session);
            $usesLiveEstimate = true;
        }

        $rate = Rate::query()
            ->where('vehicle_class', $vehicle->vehicle_class)
            ->where('billing_mode', $session->billing_mode)
            ->where('is_active', true)
            ->first();

        return response()->json([
            'plate' => $normalized,
            'is_parked' => true,
            'vehicle_class' => $vehicle->vehicle_class,
            'billing_mode' => $session->billing_mode,
            'entered_at' => $session->entered_at,
            'amount_due' => $amountStored,
            'amount_due_live' => $amountLive,
            'uses_live_estimate' => $usesLiveEstimate,
            'period_ends_at' => $session->period_ends_at,
            'rate_currency' => $rate?->currency ?? 'COP',
        ]);
    }

    /**
     * @return array{active: int, capacity: int|null, available: int|null}
     */
    private function occupancyForClass(VehicleClass $vehicleClass): array
    {
        $active = ParkingSession::query()
            ->where('status', 'active')
            ->whereHas('vehicle', fn ($q) => $q->where('vehicle_class', $vehicleClass->value))
            ->count();

        $capacity = CapacityConfig::query()
            ->where('vehicle_class', $vehicleClass->value)
            ->value('max_slots');

        $capacityInt = $capacity === null ? null : (int) $capacity;
        $available = $capacityInt === null ? null : max(0, $capacityInt - $active);

        return [
            'active' => $active,
            'capacity' => $capacityInt,
            'available' => $available,
        ];
    }
}
