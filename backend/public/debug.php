<?php

declare(strict_types=1);

define('LARAVEL_START', microtime(true));

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use App\Models\ParkingSession;
use App\Models\CapacityConfig;
use App\Enums\VehicleClass;

$action = $_GET['action'] ?? 'info';
$output = '';
$error = '';

try {
    switch ($action) {
        case 'info':
            $dbName = DB::connection()->getDatabaseName();
            $tables = DB::select("SHOW TABLES");
            $tableList = array_map(fn($t) => current((array)$t), $tables);
            
            $output .= "<h3>Estadísticas de la Base de Datos</h3>";
            $output .= "<strong>Base de Datos Conectada:</strong> " . htmlspecialchars($dbName) . "<br>";
            $output .= "<strong>Tablas encontradas (" . count($tableList) . "):</strong> " . implode(', ', $tableList) . "<br><br>";
            
            foreach (['users', 'vehicles', 'parking_sessions', 'capacity_configs', 'rates', 'parking_settings'] as $table) {
                if (in_array($table, $tableList)) {
                    $count = DB::table($table)->count();
                    $output .= "- Tabla <strong>{$table}</strong>: {$count} registros<br>";
                } else {
                    $output .= "- Tabla <strong>{$table}</strong>: <span style='color:red;'>¡NO EXISTE!</span><br>";
                }
            }
            break;

        case 'migrate':
            $exitCode = Artisan::call('migrate', ['--force' => true]);
            $output .= "<h3>Resultado de Migración</h3>";
            $output .= "<strong>Código de salida:</strong> {$exitCode}<br>";
            $output .= "<pre>" . htmlspecialchars(Artisan::output()) . "</pre>";
            break;

        case 'seed':
            $exitCode = Artisan::call('db:seed', ['--force' => true]);
            $output .= "<h3>Resultado del Sembrado (Seeder)</h3>";
            $output .= "<strong>Código de salida:</strong> {$exitCode}<br>";
            $output .= "<pre>" . htmlspecialchars(Artisan::output()) . "</pre>";
            break;

        case 'clear_cache':
            Artisan::call('config:clear');
            $out1 = Artisan::output();
            Artisan::call('route:clear');
            $out2 = Artisan::output();
            Artisan::call('cache:clear');
            $out3 = Artisan::output();
            
            $output .= "<h3>Resultado de Limpieza de Caché</h3>";
            $output .= "<pre>" . htmlspecialchars($out1 . $out2 . $out3) . "</pre>";
            break;

        case 'test_dashboard':
            $output .= "<h3>Prueba de Consulta del Dashboard</h3>";
            
            $activeCar = ParkingSession::query()
                ->where('status', 'active')
                ->whereHas('vehicle', fn ($q) => $q->where('vehicle_class', VehicleClass::Car->value))
                ->count();
            $output .= "- Total Carros Activos: {$activeCar}<br>";

            $activeMoto = ParkingSession::query()
                ->where('status', 'active')
                ->whereHas('vehicle', fn ($q) => $q->where('vehicle_class', VehicleClass::Motorcycle->value))
                ->count();
            $output .= "- Total Motos Activas: {$activeMoto}<br>";

            $capacityCar = CapacityConfig::query()->where('vehicle_class', VehicleClass::Car->value)->value('max_slots');
            $output .= "- Capacidad Carros: " . ($capacityCar ?? 'NULL') . "<br>";

            $capacityMoto = CapacityConfig::query()->where('vehicle_class', VehicleClass::Motorcycle->value)->value('max_slots');
            $output .= "- Capacidad Motos: " . ($capacityMoto ?? 'NULL') . "<br>";
            
            $output .= "<br><span style='color:green; font-weight:bold;'>¡Consulta ejecutada exitosamente sin errores!</span>";
            break;

        case 'test_revenue':
            $output .= "<h3>Prueba de Consulta de Ganancias (Revenue)</h3>";
            
            $query = ParkingSession::query()
                ->where('status', 'completed')
                ->whereNotNull('amount_paid');

            $total = (clone $query)->sum('amount_paid');
            $output .= "- Total Suma: {$total}<br>";

            $byVehicle = (clone $query)
                ->join('vehicles', 'vehicles.id', '=', 'parking_sessions.vehicle_id')
                ->selectRaw('vehicles.vehicle_class, sum(parking_sessions.amount_paid) as total')
                ->groupBy('vehicles.vehicle_class')
                ->get()
                ->pluck('total', 'vehicle_class');
            $output .= "- Agrupado por Vehículo: " . json_encode($byVehicle) . "<br>";

            $byMode = (clone $query)
                ->selectRaw('billing_mode, sum(amount_paid) as total')
                ->groupBy('billing_mode')
                ->get()
                ->pluck('total', 'billing_mode');
            $output .= "- Agrupado por Modo: " . json_encode($byMode) . "<br>";

            $output .= "<br><span style='color:green; font-weight:bold;'>¡Consulta ejecutada exitosamente sin errores!</span>";
            break;
            
        default:
            $output .= "Acción no reconocida.";
    }
} catch (\Throwable $e) {
    $error = "<h3>Error Detectado</h3>";
    $error .= "<strong>Mensaje:</strong> " . htmlspecialchars($e->getMessage()) . "<br>";
    $error .= "<strong>Archivo:</strong> " . htmlspecialchars($e->getFile()) . " (Línea " . $e->getLine() . ")<br>";
    $error .= "<h4>Stack Trace:</h4>";
    $error .= "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Panel de Diagnóstico - ParkingSoft</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; color: #1f2937; padding: 30px; margin: 0; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        h1 { color: #1e3a8a; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-top: 0; }
        .nav { margin-bottom: 25px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .nav a { display: inline-block; margin-right: 15px; padding: 8px 15px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; transition: background 0.2s; }
        .nav a:hover { background: #1d4ed8; }
        .nav a.clear { background: #ea580c; }
        .nav a.clear:hover { background: #c2410c; }
        .nav a.diag { background: #059669; }
        .nav a.diag:hover { background: #047857; }
        .result { padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 20px; }
        pre { background: #0f172a; color: #38bdf8; padding: 15px; border-radius: 6px; overflow-x: auto; font-family: 'Courier New', Courier, monospace; font-size: 13px; line-height: 1.5; }
        .alert-error { padding: 15px; background: #fee2e2; border-left: 5px solid #ef4444; color: #991b1b; border-radius: 4px; margin-top: 20px; }
        .warning-bar { padding: 12px; background: #fffbeb; border: 1px solid #fef3c7; color: #92400e; border-radius: 6px; margin-bottom: 20px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🛠️ Panel de Diagnóstico & Migraciones - ParkingSoft</h1>
        
        <div class="warning-bar">
            <strong>⚠️ Recordatorio de Seguridad:</strong> Después de resolver los problemas en tu servidor de producción, <strong>elimina este archivo (<code>debug.php</code>)</strong> de la carpeta pública para evitar accesos no autorizados a la base de datos.
        </div>

        <div class="nav">
            <strong>Acciones rápidas:</strong><br><br>
            <a href="?action=info">📊 Información de BD</a>
            <a href="?action=clear_cache" class="clear">🧹 Limpiar Cachés</a>
            <a href="?action=migrate">🚀 Correr Migraciones</a>
            <a href="?action=seed">🌱 Correr Seeders (Tarifas/Capacidades)</a>
            <a href="?action=test_dashboard" class="diag">🩺 Probar Dashboard</a>
            <a href="?action=test_revenue" class="diag">🩺 Probar Ganancias</a>
        </div>

        <?php if ($error): ?>
            <div class="alert-error">
                <?php echo $error; ?>
            </div>
        <?php endif; ?>

        <?php if ($output): ?>
            <div class="result">
                <?php echo $output; ?>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
