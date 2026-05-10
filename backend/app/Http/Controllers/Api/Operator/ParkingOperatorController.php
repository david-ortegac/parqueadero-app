<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Operator;

use App\Enums\BillingMode;
use App\Enums\VehicleClass;
use App\Http\Controllers\Controller;
use App\Models\CapacityConfig;
use App\Models\ParkingSession;
use App\Models\Rate;
use App\Models\Vehicle;
use App\Services\ParkingBillingService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class ParkingOperatorController extends Controller
{
    public function __construct(
        private readonly ParkingBillingService $billing,
    ) {}

    public function checkIn(Request $request): JsonResponse
    {
        $data = $request->validate([
            'plate' => ['required', 'string', 'max:32'],
            'depositor_document' => ['required', 'string', 'max:64'],
            'vehicle_class' => ['required', 'in:'.implode(',', VehicleClass::values())],
            'billing_mode' => ['required', 'in:'.implode(',', BillingMode::values())],
            'owner_user_id' => ['nullable', 'exists:users,id'],
        ]);

        $rate = Rate::query()
            ->where('vehicle_class', $data['vehicle_class'])
            ->where('billing_mode', $data['billing_mode'])
            ->where('is_active', true)
            ->first();

        if ($rate === null) {
            return response()->json(['message' => 'No existe tarifa activa para esta combinación.'], 422);
        }

        $capacity = CapacityConfig::query()->where('vehicle_class', $data['vehicle_class'])->first();
        if ($capacity !== null) {
            $active = ParkingSession::query()
                ->where('status', 'active')
                ->whereHas('vehicle', fn ($q) => $q->where('vehicle_class', $data['vehicle_class']))
                ->count();
            if ($active >= $capacity->max_slots) {
                return response()->json(['message' => 'Capacidad máxima alcanzada para esta clase de vehículo.'], 422);
            }
        }

        return DB::transaction(function () use ($request, $data, $rate): JsonResponse {
            $plate = strtoupper(trim($data['plate']));
            $vehicle = Vehicle::query()->firstOrNew(['plate' => $plate]);
            $vehicle->fill([
                'depositor_document' => $data['depositor_document'],
                'vehicle_class' => $data['vehicle_class'],
                'owner_user_id' => $data['owner_user_id'] ?? $vehicle->owner_user_id,
                'registered_by_user_id' => $request->user()?->id,
            ]);
            $vehicle->save();

            $hasActive = ParkingSession::query()
                ->where('vehicle_id', $vehicle->id)
                ->where('status', 'active')
                ->exists();

            if ($hasActive) {
                return response()->json(['message' => 'Este vehículo ya tiene una sesión activa.'], 422);
            }

            $now = CarbonImmutable::now();
            $mode = BillingMode::from($data['billing_mode']);
            $amountDue = '0.00';
            $periodStart = null;
            $periodEnd = null;

            if (in_array($mode, [BillingMode::Week, BillingMode::Month], true)) {
                $amountDue = number_format((float) $rate->price, 2, '.', '');
                $periodStart = $now;
                $periodEnd = $this->billing->subscriptionEndsAt($mode, $now);
            }

            $session = ParkingSession::query()->create([
                'vehicle_id' => $vehicle->id,
                'billing_mode' => $data['billing_mode'],
                'entered_at' => $now,
                'status' => 'active',
                'amount_due' => $amountDue,
                'period_starts_at' => $periodStart,
                'period_ends_at' => $periodEnd,
                'registered_by_user_id' => $request->user()?->id,
            ]);

            return response()->json([
                'session' => $session->load('vehicle'),
            ], 201);
        });
    }

    public function checkOut(Request $request, ParkingSession $session): JsonResponse
    {
        if ($session->status !== 'active') {
            return response()->json(['message' => 'La sesión no está activa.'], 422);
        }

        $mode = BillingMode::tryFrom($session->billing_mode);
        $amountDue = $session->amount_due;

        if ($mode !== null && in_array($mode, [BillingMode::Minute, BillingMode::Hour, BillingMode::Day], true)) {
            $amountDue = $this->billing->calculateCheckoutAmount($session);
        }

        $session->update([
            'status' => 'completed',
            'exited_at' => CarbonImmutable::now(),
            'amount_due' => $amountDue,
            'amount_paid' => $amountDue,
        ]);

        return response()->json($session->load('vehicle'));
    }

    public function activeSessions(): JsonResponse
    {
        $sessions = ParkingSession::query()
            ->where('status', 'active')
            ->with('vehicle')
            ->orderByDesc('entered_at')
            ->get();

        return response()->json($sessions);
    }

    public function dashboard(): JsonResponse
    {
        $activeCar = ParkingSession::query()
            ->where('status', 'active')
            ->whereHas('vehicle', fn ($q) => $q->where('vehicle_class', VehicleClass::Car->value))
            ->count();

        $activeMoto = ParkingSession::query()
            ->where('status', 'active')
            ->whereHas('vehicle', fn ($q) => $q->where('vehicle_class', VehicleClass::Motorcycle->value))
            ->count();

        $capacityCar = CapacityConfig::query()->where('vehicle_class', VehicleClass::Car->value)->value('max_slots');
        $capacityMoto = CapacityConfig::query()->where('vehicle_class', VehicleClass::Motorcycle->value)->value('max_slots');

        return response()->json([
            'occupancy' => [
                'car' => ['active' => $activeCar, 'capacity' => $capacityCar],
                'motorcycle' => ['active' => $activeMoto, 'capacity' => $capacityMoto],
            ],
        ]);
    }

    public function revenueSummary(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $query = ParkingSession::query()
            ->where('status', 'completed')
            ->whereNotNull('amount_paid');

        if (! empty($filters['from'])) {
            $query->whereDate('exited_at', '>=', $filters['from']);
        }
        if (! empty($filters['to'])) {
            $query->whereDate('exited_at', '<=', $filters['to']);
        }

        $total = (clone $query)->sum('amount_paid');

        $byVehicle = (clone $query)
            ->join('vehicles', 'vehicles.id', '=', 'parking_sessions.vehicle_id')
            ->selectRaw('vehicles.vehicle_class, sum(parking_sessions.amount_paid) as total')
            ->groupBy('vehicles.vehicle_class')
            ->pluck('total', 'vehicle_class');

        $byMode = (clone $query)
            ->selectRaw('billing_mode, sum(amount_paid) as total')
            ->groupBy('billing_mode')
            ->pluck('total', 'billing_mode');

        return response()->json([
            'total' => $total,
            'by_vehicle_class' => $byVehicle,
            'by_billing_mode' => $byMode,
        ]);
    }

    /**
     * Historial por día calendario (zona horaria de la app).
     *
     * - completed_exits: sesiones que cerraron ese día (salida/cobro).
     * - open_stays: ingresaron en o antes de ese día y no habían salido al terminar el día
     *   (siguen dentro o salieron después); así un vehículo sin salida “pasa” al día siguiente.
     */
    public function dailyHistory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => ['required', 'date'],
        ]);

        $tz = config('app.timezone');
        $day = CarbonImmutable::parse($data['date'], $tz)->startOfDay();
        $dayEnd = $day->endOfDay();

        $completedExits = ParkingSession::query()
            ->where('status', 'completed')
            ->whereDate('exited_at', $day->toDateString())
            ->with('vehicle')
            ->orderBy('exited_at')
            ->get();

        $openStays = ParkingSession::query()
            ->where('entered_at', '<=', $dayEnd)
            ->where(function ($q) use ($dayEnd): void {
                $q->where('status', 'active')
                    ->orWhere(function ($q2) use ($dayEnd): void {
                        $q2->where('status', 'completed')
                            ->whereNotNull('exited_at')
                            ->where('exited_at', '>', $dayEnd);
                    });
            })
            ->with('vehicle')
            ->orderBy('entered_at')
            ->get();

        return response()->json([
            'date' => $day->toDateString(),
            'timezone' => $tz,
            'completed_exits' => $completedExits,
            'open_stays' => $openStays,
        ]);
    }
}
