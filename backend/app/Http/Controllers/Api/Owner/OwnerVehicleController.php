<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Owner;

use App\Enums\BillingMode;
use App\Http\Controllers\Controller;
use App\Models\ParkingSession;
use App\Models\Rate;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\ParkingBillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

final class OwnerVehicleController extends Controller
{
    public function __construct(
        private readonly ParkingBillingService $billing,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        $docNorm = $this->normalizeDocumentDigits((string) ($user->document ?? ''));
        $this->linkUnclaimedVehiclesByDocument($user, $docNorm);

        $vehicles = Vehicle::query()
            ->where('owner_user_id', $user->id)
            ->with([
                'activeParkingSession' => function ($q): void {
                    $q->with('vehicle');
                },
            ])
            ->orderBy('plate')
            ->get()
            ->map(fn (Vehicle $v) => $this->vehicleToApi($v));

        return response()->json($vehicles);
    }

    public function show(Request $request, Vehicle $vehicle): JsonResponse
    {
        $this->authorizeOwner($request, $vehicle);

        $vehicle->load([
            'activeParkingSession' => function ($q): void {
                $q->with('vehicle');
            },
        ]);

        return response()->json($this->vehicleToApi($vehicle));
    }

    public function updateProfile(Request $request, Vehicle $vehicle): JsonResponse
    {
        $this->authorizeOwner($request, $vehicle);

        $data = $request->validate([
            'brand' => ['sometimes', 'nullable', 'string', 'max:255'],
            'color' => ['sometimes', 'nullable', 'string', 'max:255'],
            'cylinder_cc' => ['sometimes', 'nullable', 'string', 'max:32'],
            'photo' => ['sometimes', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:4096'],
        ]);

        if ($request->hasFile('photo')) {
            if ($vehicle->photo_path) {
                Storage::disk('public')->delete($vehicle->photo_path);
            }
            $data['photo_path'] = $request->file('photo')->store('vehicles', 'public');
        }

        unset($data['photo']);
        $vehicle->update($data);

        $fresh = $vehicle->fresh();
        if ($fresh === null) {
            return response()->json(['message' => 'Vehículo no encontrado.'], 404);
        }

        $fresh->load([
            'activeParkingSession' => function ($q): void {
                $q->with('vehicle');
            },
        ]);

        return response()->json($this->vehicleToApi($fresh));
    }

    public function activeSession(Request $request, Vehicle $vehicle): JsonResponse
    {
        $this->authorizeOwner($request, $vehicle);

        $session = ParkingSession::query()
            ->where('vehicle_id', $vehicle->id)
            ->where('status', 'active')
            ->with('vehicle')
            ->latest('entered_at')
            ->first();

        if ($session === null) {
            return response()->json(['message' => 'Sin sesión activa.'], 404);
        }

        return response()->json($this->transformSession($session));
    }

    public function sessionHistory(Request $request, Vehicle $vehicle): JsonResponse
    {
        $this->authorizeOwner($request, $vehicle);

        $sessions = ParkingSession::query()
            ->where('vehicle_id', $vehicle->id)
            ->where('status', 'completed')
            ->orderByDesc('exited_at')
            ->limit(100)
            ->get();

        $items = $sessions->map(fn (ParkingSession $s) => [
            'id' => $s->id,
            'billing_mode' => $s->billing_mode,
            'entered_at' => $s->entered_at,
            'exited_at' => $s->exited_at,
            'amount_due' => $s->amount_due,
            'amount_paid' => $s->amount_paid,
        ]);

        return response()->json($items);
    }

    private function authorizeOwner(Request $request, Vehicle $vehicle): void
    {
        if (! $this->ownerMayAccessVehicle($request->user(), $vehicle)) {
            abort(403, 'No autorizado.');
        }
    }

    private function ownerMayAccessVehicle(?User $user, Vehicle $vehicle): bool
    {
        if ($user === null) {
            return false;
        }

        if ((int) ($vehicle->owner_user_id ?? 0) === (int) $user->id) {
            return true;
        }

        $docNorm = $this->normalizeDocumentDigits((string) ($user->document ?? ''));
        if ($docNorm === '') {
            return false;
        }

        if ($vehicle->owner_user_id !== null) {
            return false;
        }

        return $this->depositorDocumentDigits($vehicle) === $docNorm;
    }

    private function linkUnclaimedVehiclesByDocument(User $user, string $documentDigits): void
    {
        if ($documentDigits === '') {
            return;
        }

        Vehicle::query()
            ->whereNull('owner_user_id')
            ->where(function ($q) use ($documentDigits): void {
                $q->where('depositor_document', $documentDigits)
                    ->orWhereRaw(
                        "replace(replace(replace(replace(trim(coalesce(depositor_document, '')), '.', ''), '-', ''), ' ', ''), ',', '') = ?",
                        [$documentDigits]
                    );
            })
            ->update(['owner_user_id' => $user->id]);
    }

    private function depositorDocumentDigits(Vehicle $vehicle): string
    {
        return $this->normalizeDocumentDigits((string) $vehicle->depositor_document);
    }

    private function normalizeDocumentDigits(string $raw): string
    {
        return preg_replace('/\D+/', '', $raw) ?? '';
    }

    /**
     * @return array<string, mixed>
     */
    private function vehicleToApi(Vehicle $vehicle): array
    {
        $photoUrl = null;
        if ($vehicle->photo_path) {
            $photoUrl = Storage::disk('public')->url($vehicle->photo_path);
        }

        $active = $vehicle->relationLoaded('activeParkingSession')
            ? $vehicle->activeParkingSession
            : $vehicle->activeParkingSession()->with('vehicle')->first();

        return [
            'id' => $vehicle->id,
            'plate' => $vehicle->plate,
            'vehicle_class' => $vehicle->vehicle_class,
            'brand' => $vehicle->brand,
            'color' => $vehicle->color,
            'cylinder_cc' => $vehicle->cylinder_cc,
            'photo_url' => $photoUrl,
            'active_session' => $active !== null ? $this->transformSession($active) : null,
        ];
    }

    /**
     * @return array{rate_unit_price: string|null, rate_currency: string}
     */
    private function ratePayloadForSession(ParkingSession $session): array
    {
        $session->loadMissing('vehicle');
        $vehicle = $session->vehicle;
        if ($vehicle === null) {
            return [
                'rate_unit_price' => null,
                'rate_currency' => 'COP',
            ];
        }

        $rate = Rate::query()
            ->where('vehicle_class', $vehicle->vehicle_class)
            ->where('billing_mode', $session->billing_mode)
            ->where('is_active', true)
            ->first();

        if ($rate === null) {
            return [
                'rate_unit_price' => null,
                'rate_currency' => 'COP',
            ];
        }

        return [
            'rate_unit_price' => number_format((float) $rate->price, 2, '.', ''),
            'rate_currency' => (string) $rate->currency,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformSession(ParkingSession $session): array
    {
        $mode = BillingMode::tryFrom($session->billing_mode);
        $amountStored = (string) $session->amount_due;
        $amountLive = $amountStored;
        $usesLiveEstimate = false;

        if ($mode !== null && in_array($mode, [BillingMode::Minute, BillingMode::Hour, BillingMode::Day], true)) {
            $amountLive = $this->billing->calculateCheckoutAmount($session);
            $usesLiveEstimate = true;
        }

        $rate = $this->ratePayloadForSession($session);

        return [
            'id' => $session->id,
            'billing_mode' => $session->billing_mode,
            'entered_at' => $session->entered_at,
            'amount_due' => $amountStored,
            'amount_due_live' => $amountLive,
            'uses_live_estimate' => $usesLiveEstimate,
            'period_starts_at' => $session->period_starts_at,
            'period_ends_at' => $session->period_ends_at,
            'subscription_entry_day' => $session->subscription_entry_day,
            'subscription_period_days' => $session->subscription_period_days,
            'rate_unit_price' => $rate['rate_unit_price'],
            'rate_currency' => $rate['rate_currency'],
        ];
    }
}
