<?php

declare(strict_types=1);

use App\Http\Controllers\Api\Admin\CapacityConfigController;
use App\Http\Controllers\Api\Admin\OperatingScheduleController;
use App\Http\Controllers\Api\Admin\RateController;
use App\Http\Controllers\Api\Admin\UserAdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Operator\ParkingOperatorController;
use App\Http\Controllers\Api\Operator\VehicleOwnerActivationController;
use App\Http\Controllers\Api\Owner\OwnerVehicleController;
use App\Http\Controllers\Api\PushDeviceController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);

        Route::post('/push-devices', [PushDeviceController::class, 'register']);

        Route::middleware('role:admin')->prefix('admin')->group(function (): void {
            Route::get('/rates', [RateController::class, 'index']);
            Route::post('/rates', [RateController::class, 'store']);
            Route::patch('/rates/{rate}', [RateController::class, 'update']);
            Route::delete('/rates/{rate}', [RateController::class, 'destroy']);

            Route::get('/users', [UserAdminController::class, 'index']);
            Route::post('/users', [UserAdminController::class, 'store']);
            Route::patch('/users/{user}', [UserAdminController::class, 'update']);

            Route::get('/schedules', [OperatingScheduleController::class, 'index']);
            Route::post('/schedules', [OperatingScheduleController::class, 'store']);

            Route::get('/capacity', [CapacityConfigController::class, 'index']);
            Route::post('/capacity', [CapacityConfigController::class, 'store']);

            Route::get('/parking-info', [\App\Http\Controllers\Api\Admin\ParkingConfigController::class, 'show']);
            Route::patch('/parking-info', [\App\Http\Controllers\Api\Admin\ParkingConfigController::class, 'update']);
        });

        Route::middleware('role:admin,operator')->prefix('operator')->group(function (): void {
            Route::get('/vehicle-owners', [VehicleOwnerActivationController::class, 'index']);

            Route::post('/check-in', [ParkingOperatorController::class, 'checkIn']);
            Route::post('/sessions/{session}/check-out', [ParkingOperatorController::class, 'checkOut']);
            Route::get('/sessions/active', [ParkingOperatorController::class, 'activeSessions']);
            Route::get('/dashboard', [ParkingOperatorController::class, 'dashboard']);
            Route::get('/reports/revenue', [ParkingOperatorController::class, 'revenueSummary']);
            Route::get('/reports/daily-history', [ParkingOperatorController::class, 'dailyHistory']);

            Route::patch('/vehicle-owners/{user}', [VehicleOwnerActivationController::class, 'update']);
        });

        Route::middleware('role:vehicle_owner')->prefix('owner')->group(function (): void {
            Route::get('/vehicles', [OwnerVehicleController::class, 'index']);
            Route::get('/vehicles/{vehicle}', [OwnerVehicleController::class, 'show']);
            Route::patch('/vehicles/{vehicle}', [OwnerVehicleController::class, 'updateProfile']);
            Route::get('/vehicles/{vehicle}/active-session', [OwnerVehicleController::class, 'activeSession']);
            Route::get('/vehicles/{vehicle}/sessions', [OwnerVehicleController::class, 'sessionHistory']);
        });
    });
});
