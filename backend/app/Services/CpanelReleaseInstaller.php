<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\File;
use RuntimeException;
use Symfony\Component\Process\Process;
use Throwable;

/**
 * Instala un release .tar.gz en la ruta de cPanel con reemplazo completo,
 * preservando .env y storage de la instalación viva.
 */
final class CpanelReleaseInstaller
{
    /**
     * @return array{
     *   ok: bool,
     *   target: string,
     *   release: string,
     *   previous: string|null,
     *   composer: array{ok: bool, output: string}|null,
     *   pipeline: array{ok: bool, steps: list<array{name: string, ok: bool, output: string}>}|null,
     *   message: string
     * }
     */
    public function installFromArchive(string $archivePath, CpanelDeployPipeline $pipeline): array
    {
        $target = $this->resolveTargetPath();
        $parent = dirname($target);
        $release = $parent.'/'.basename($target).'_release';
        $previous = $parent.'/'.basename($target).'_previous';

        if (! is_file($archivePath)) {
            throw new RuntimeException('Archivo de release no encontrado.');
        }

        $this->assertWritableParent($parent);
        $this->resetDirectory($release);
        $this->extractArchive($archivePath, $release);
        $this->assertLaravelRelease($release);
        $this->preserveLiveData($target, $release);
        $this->ensureStorageSkeleton($release);

        $composer = null;
        if (config('cpanel-deploy.run_composer')) {
            $composer = $this->runComposerInstall($release);
            if (! $composer['ok'] && config('cpanel-deploy.require_composer')) {
                return [
                    'ok' => false,
                    'target' => $target,
                    'release' => $release,
                    'previous' => null,
                    'composer' => $composer,
                    'pipeline' => null,
                    'message' => 'composer install falló; no se hizo el reemplazo.',
                ];
            }
        }

        $this->swapRelease($target, $release, $previous);
        $this->ensureStorageSkeleton($target);

        $pipelineResult = null;
        if (config('cpanel-deploy.run_pipeline_after_swap')) {
            // Tras el swap, base_path() sigue apuntando al proceso viejo en memoria;
            // ejecutamos artisan en el path nuevo.
            $pipelineResult = $this->runArtisanPipelineInPath($target);
            if ($pipelineResult === null) {
                $pipelineResult = $pipeline->run();
            }
        }

        @unlink($archivePath);

        $ok = ($composer === null || $composer['ok'] || ! config('cpanel-deploy.require_composer'))
            && ($pipelineResult === null || $pipelineResult['ok']);

        return [
            'ok' => $ok,
            'target' => $target,
            'release' => $release,
            'previous' => is_dir($previous) ? $previous : null,
            'composer' => $composer,
            'pipeline' => $pipelineResult,
            'message' => $ok
                ? 'Release instalado y reemplazo completado.'
                : 'Release instalado con advertencias o errores en pasos posteriores.',
        ];
    }

    public function resolveTargetPath(): string
    {
        $configured = rtrim((string) config('cpanel-deploy.remote_path'), '/');
        if ($configured === '') {
            throw new RuntimeException('CPANEL_DEPLOY_PATH no está configurado.');
        }

        $baseReal = realpath(base_path()) ?: rtrim(base_path(), '/');
        $configuredReal = realpath($configured) ?: $configured;

        if ($configuredReal !== $baseReal) {
            throw new RuntimeException(
                "CPANEL_DEPLOY_PATH ({$configured}) debe coincidir con la app en ejecución ({$baseReal})."
            );
        }

        return $baseReal;
    }

    private function assertWritableParent(string $parent): void
    {
        if (! is_dir($parent) || ! is_writable($parent)) {
            throw new RuntimeException("El directorio padre no es escribible: {$parent}");
        }
    }

    private function resetDirectory(string $path): void
    {
        if (is_dir($path)) {
            File::deleteDirectory($path);
        }
        if (! mkdir($path, 0755, true) && ! is_dir($path)) {
            throw new RuntimeException("No se pudo crear staging: {$path}");
        }
    }

    private function extractArchive(string $archivePath, string $destination): void
    {
        $process = new Process(['tar', '-xzf', $archivePath, '-C', $destination]);
        $process->setTimeout(300);
        $process->run();
        if (! $process->isSuccessful()) {
            throw new RuntimeException(
                'Error al descomprimir: '.trim($process->getErrorOutput().' '.$process->getOutput())
            );
        }
    }

    private function assertLaravelRelease(string $release): void
    {
        foreach (['artisan', 'composer.json'] as $required) {
            if (! is_file($release.'/'.$required)) {
                throw new RuntimeException("El archivo tar.gz no parece un backend Laravel (falta {$required}).");
            }
        }
        if (! is_file($release.'/index.php') && ! is_file($release.'/public/index.php')) {
            throw new RuntimeException('El archivo tar.gz no tiene index.php (layout plano o public/).');
        }
    }

    private function preserveLiveData(string $live, string $release): void
    {
        if (! is_dir($live)) {
            return;
        }

        $envLive = $live.'/.env';
        if (is_file($envLive)) {
            File::copy($envLive, $release.'/.env');
        }

        $storageLive = $live.'/storage';
        $storageRelease = $release.'/storage';
        if (is_dir($storageLive)) {
            if (is_dir($storageRelease)) {
                File::deleteDirectory($storageRelease);
            }
            File::copyDirectory($storageLive, $storageRelease);
        }

        // Evitar arrastrar artefactos de deploy previos.
        $deployDir = $storageRelease.'/app/deploy';
        if (is_dir($deployDir)) {
            File::deleteDirectory($deployDir);
        }
    }

    /** Estructura mínima de storage para views/cache/sessions/logs. */
    private function ensureStorageSkeleton(string $root): void
    {
        $directories = [
            'bootstrap/cache',
            'storage/app',
            'storage/app/public',
            'storage/app/private',
            'storage/framework',
            'storage/framework/cache',
            'storage/framework/cache/data',
            'storage/framework/sessions',
            'storage/framework/testing',
            'storage/framework/views',
            'storage/logs',
        ];

        foreach ($directories as $relative) {
            $path = $root.'/'.$relative;
            if (! is_dir($path) && ! mkdir($path, 0775, true) && ! is_dir($path)) {
                throw new RuntimeException("No se pudo crear directorio requerido: {$path}");
            }
            $keep = $path.'/.gitignore';
            if (! is_file($keep)) {
                File::put($keep, "*\n!.gitignore\n");
            }
        }
    }

    /**
     * @return array{ok: bool, output: string}
     */
    private function runComposerInstall(string $release): array
    {
        if (is_file($release.'/vendor/autoload.php')) {
            return ['ok' => true, 'output' => 'vendor incluido en el release (sin dependencias dev).'];
        }

        $candidates = [
            ['composer', 'install', '--no-dev', '--optimize-autoloader', '--no-interaction'],
            ['php', $release.'/composer.phar', 'install', '--no-dev', '--optimize-autoloader', '--no-interaction'],
        ];

        $output = '';
        foreach ($candidates as $command) {
            if ($command[0] === 'composer' && ! $this->commandExists('composer')) {
                continue;
            }
            if ($command[0] === 'php' && ! is_file($release.'/composer.phar')) {
                continue;
            }
            $process = new Process($command, $release);
            $process->setTimeout(600);
            $process->run();
            $output = trim($process->getOutput()."\n".$process->getErrorOutput());
            if ($process->isSuccessful()) {
                return ['ok' => true, 'output' => $output];
            }
        }

        return [
            'ok' => false,
            'output' => $output !== '' ? $output : 'composer no disponible en el servidor.',
        ];
    }

    private function commandExists(string $command): bool
    {
        $process = Process::fromShellCommandline('command -v '.escapeshellarg($command));
        $process->run();

        return $process->isSuccessful() && trim($process->getOutput()) !== '';
    }

    private function swapRelease(string $target, string $release, string $previous): void
    {
        if (is_dir($previous)) {
            File::deleteDirectory($previous);
        }

        if (is_dir($target)) {
            if (! rename($target, $previous)) {
                throw new RuntimeException("No se pudo renombrar {$target} -> {$previous}");
            }
        }

        if (! rename($release, $target)) {
            // Intentar rollback
            if (is_dir($previous) && ! is_dir($target)) {
                @rename($previous, $target);
            }
            throw new RuntimeException("No se pudo renombrar {$release} -> {$target}");
        }
    }

    /**
     * @return array{ok: bool, steps: list<array{name: string, ok: bool, output: string}>}|null
     */
    private function runArtisanPipelineInPath(string $target): ?array
    {
        $artisan = $target.'/artisan';
        if (! is_file($artisan)) {
            return null;
        }

        $stepsConfig = config('cpanel-deploy.steps', []);
        $map = [
            'optimize_clear' => ['php', $artisan, 'optimize:clear'],
            'migrate' => ['php', $artisan, 'migrate', '--force'],
            'storage_link' => ['php', $artisan, 'storage:link', '--force'],
            'config_cache' => ['php', $artisan, 'config:cache'],
            'route_cache' => ['php', $artisan, 'route:cache'],
            'view_cache' => ['php', $artisan, 'view:cache'],
            'event_cache' => ['php', $artisan, 'event:cache'],
        ];

        $results = [];
        $allOk = true;
        foreach ($map as $name => $command) {
            if (! ($stepsConfig[$name] ?? false)) {
                continue;
            }
            try {
                $process = new Process($command, $target);
                $process->setTimeout(300);
                $process->run();
                $ok = $process->isSuccessful();
                if (! $ok) {
                    $allOk = false;
                }
                $results[] = [
                    'name' => $name,
                    'ok' => $ok,
                    'output' => trim($process->getOutput().' '.$process->getErrorOutput()),
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

        return ['ok' => $allOk, 'steps' => $results];
    }
}
