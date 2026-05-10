<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Owner;

use App\Http\Controllers\Controller;
use App\Models\ParkingSession;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

final class OwnerVehicleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()?->id;
        $vehicles = Vehicle::query()
            ->where('owner_user_id', $userId)
            ->orderBy('plate')
            ->get()
            ->map(fn (Vehicle $v) => $this->transformVehicle($v));

        return response()->json($vehicles);
    }

    public function show(Request $request, Vehicle $vehicle): JsonResponse
    {
        $this->authorizeOwner($request, $vehicle);

        return response()->json($this->transformVehicle($vehicle));
    }

    public function updateProfile(Request $request, Vehicle $vehicle): JsonResponse
    {
        $this->authorizeOwner($request, $vehicle);

        $data = $request->validate([
            'brand' => ['sometimes', 'nullable', 'string', 'max:255'],
            'color' => ['sometimes', 'nullable', 'string', 'max:255'],
            'photo' => ['sometimes', 'image', 'max:4096'],
        ]);

        if ($request->hasFile('photo')) {
            if ($vehicle->photo_path) {
                Storage::disk('public')->delete($vehicle->photo_path);
            }
            $data['photo_path'] = $request->file('photo')->store('vehicles', 'public');
        }

        unset($data['photo']);
        $vehicle->update($data);

        return response()->json($this->transformVehicle($vehicle->fresh()));
    }

    public function activeSession(Request $request, Vehicle $vehicle): JsonResponse
    {
        $this->authorizeOwner($request, $vehicle);

        $session = ParkingSession::query()
            ->where('vehicle_id', $vehicle->id)
            ->where('status', 'active')
            ->latest('entered_at')
            ->first();

        if ($session === null) {
            return response()->json(['message' => 'Sin sesión activa.'], 404);
        }

        return response()->json($this->transformSession($session));
    }

    private function authorizeOwner(Request $request, Vehicle $vehicle): void
    {
        if ($vehicle->owner_user_id !== $request->user()?->id) {
            abort(403, 'No autorizado.');
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function transformVehicle(Vehicle $vehicle): array
    {
        $photoUrl = null;
        if ($vehicle->photo_path) {
            $photoUrl = Storage::disk('public')->url($vehicle->photo_path);
        }

        return [
            'id' => $vehicle->id,
            'plate' => $vehicle->plate,
            'vehicle_class' => $vehicle->vehicle_class,
            'brand' => $vehicle->brand,
            'color' => $vehicle->color,
            'photo_url' => $photoUrl,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformSession(ParkingSession $session): array
    {
        return [
            'id' => $session->id,
            'billing_mode' => $session->billing_mode,
            'entered_at' => $session->entered_at,
            'amount_due' => $session->amount_due,
            'period_starts_at' => $session->period_starts_at,
            'period_ends_at' => $session->period_ends_at,
        ];
    }
}
