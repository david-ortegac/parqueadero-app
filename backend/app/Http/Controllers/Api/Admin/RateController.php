<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Admin;

use App\Enums\BillingMode;
use App\Enums\VehicleClass;
use App\Http\Controllers\Controller;
use App\Models\Rate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class RateController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Rate::query()->orderBy('vehicle_class')->orderBy('billing_mode')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'vehicle_class' => ['required', 'in:'.implode(',', VehicleClass::values())],
            'billing_mode' => ['required', 'in:'.implode(',', BillingMode::values())],
            'price' => ['required', 'numeric', 'min:0'],
            'currency' => ['sometimes', 'string', 'max:8'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $rate = Rate::query()->updateOrCreate(
            [
                'vehicle_class' => $data['vehicle_class'],
                'billing_mode' => $data['billing_mode'],
            ],
            [
                'price' => $data['price'],
                'currency' => $data['currency'] ?? 'COP',
                'is_active' => $data['is_active'] ?? true,
            ]
        );

        return response()->json($rate, 201);
    }

    public function update(Request $request, Rate $rate): JsonResponse
    {
        $data = $request->validate([
            'price' => ['sometimes', 'numeric', 'min:0'],
            'currency' => ['sometimes', 'string', 'max:8'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $rate->update($data);

        return response()->json($rate);
    }

    public function destroy(Rate $rate): JsonResponse
    {
        $rate->delete();

        return response()->json(null, 204);
    }
}
