<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Operator;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class VehicleOwnerActivationController extends Controller
{
    public function update(Request $request, User $user): JsonResponse
    {
        if ($user->role !== UserRole::VehicleOwner->value) {
            return response()->json(['message' => 'Solo se pueden activar usuarios propietarios de vehículo.'], 422);
        }

        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $user->update(['is_active' => $data['is_active']]);

        return response()->json([
            'id' => $user->id,
            'is_active' => $user->is_active,
        ]);
    }
}
