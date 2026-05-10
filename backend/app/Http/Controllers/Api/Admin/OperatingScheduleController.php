<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\OperatingSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class OperatingScheduleController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(OperatingSchedule::query()->orderBy('day_of_week')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'day_of_week' => ['required', 'integer', 'min:0', 'max:6'],
            'opens_at' => ['nullable', 'date_format:H:i'],
            'closes_at' => ['nullable', 'date_format:H:i'],
            'is_closed' => ['sometimes', 'boolean'],
        ]);

        $row = OperatingSchedule::query()->updateOrCreate(
            ['day_of_week' => $data['day_of_week']],
            [
                'opens_at' => $data['opens_at'] ?? null,
                'closes_at' => $data['closes_at'] ?? null,
                'is_closed' => $data['is_closed'] ?? false,
            ]
        );

        return response()->json($row, 201);
    }
}
