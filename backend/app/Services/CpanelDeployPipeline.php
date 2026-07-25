<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Artisan;
use Throwable;

/**
 * Post-deploy tasks safe for shared cPanel hosting (no migrate:fresh).
 */
final class CpanelDeployPipeline
{
    /**
     * @return array{ok: bool, steps: list<array{name: string, ok: bool, output: string}>}
     */
    public function run(): array
    {
        $stepsConfig = config('cpanel-deploy.steps', []);
        $results = [];
        $allOk = true;

        $map = [
            // Primero limpia caches (evita .env/sqlite de otro entorno).
            'optimize_clear' => fn (): int => Artisan::call('optimize:clear'),
            'migrate' => fn (): int => Artisan::call('migrate', ['--force' => true]),
            'storage_link' => fn (): int => Artisan::call('storage:link', ['--force' => true]),
            'config_cache' => fn (): int => Artisan::call('config:cache'),
            'route_cache' => fn (): int => Artisan::call('route:cache'),
            'view_cache' => fn (): int => Artisan::call('view:cache'),
            'event_cache' => fn (): int => Artisan::call('event:cache'),
        ];

        foreach ($map as $name => $runner) {
            if (! ($stepsConfig[$name] ?? false)) {
                continue;
            }
            try {
                $exitCode = $runner();
                $output = trim(Artisan::output());
                $ok = $exitCode === 0;
                if (! $ok) {
                    $allOk = false;
                }
                $results[] = [
                    'name' => $name,
                    'ok' => $ok,
                    'output' => $output !== '' ? $output : "exit {$exitCode}",
                ];
            } catch (Throwable $e) {
                $allOk = false;
                $results[] = [
                    'name' => $name,
                    'ok' => false,
                    'output' => $e->getMessage(),
                ];
            }
        }

        return [
            'ok' => $allOk,
            'steps' => $results,
        ];
    }
}
