<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Operator;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class VehicleOwnerActivationController extends Controller
{
    public function index(): JsonResponse
    {
        $owners = User::query()
            ->where('role', UserRole::VehicleOwner->value)
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'email', 'document', 'is_active', 'created_at']);

        return response()->json($owners);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        if ($user->role !== UserRole::VehicleOwner->value) {
            return response()->json(['message' => 'Solo se pueden activar usuarios propietarios de vehículo.'], 422);
        }

        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        if ($data['is_active'] === false && $request->user()?->id === $user->id) {
            return response()->json(['message' => 'No puedes desactivar tu propia cuenta.'], 403);
        }

        $user->update(['is_active' => $data['is_active']]);

        if ($data['is_active'] && $user->document !== null && $user->document !== '') {
            Vehicle::query()
                ->where('depositor_document', $user->document)
                ->where(function ($q) use ($user): void {
                    $q->whereNull('owner_user_id')
                        ->orWhere('owner_user_id', $user->id);
                })
                ->update(['owner_user_id' => $user->id]);
        }

        return response()->json([
            'id' => $user->id,
            'is_active' => $user->is_active,
        ]);
    }
}
