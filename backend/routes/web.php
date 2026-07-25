<?php

use App\Http\Controllers\CpanelDeployController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::middleware(['throttle:6,1', 'cpanel.deploy'])
    ->prefix('cpanel-deploy')
    ->group(function (): void {
        Route::get('/', CpanelDeployController::class);
        Route::get('/health', [CpanelDeployController::class, 'health']);
        Route::post('/release', [CpanelDeployController::class, 'release']);
    });
