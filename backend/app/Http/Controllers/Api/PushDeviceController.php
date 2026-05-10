<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushDevice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class PushDeviceController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'platform' => ['required', 'in:ios,android,web'],
        ]);

        $user = $request->user();
        if ($user === null) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        PushDevice::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'token' => $data['token'],
            ],
            ['platform' => $data['platform']]
        );

        return response()->json(['message' => 'Token registrado.']);
    }
}
