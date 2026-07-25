<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Process;

/**
 * Empaqueta el backend y lo sube a cPanel con API token (estilo carwash).
 *
 * Tras subir el .tar.gz y .deploy-pending, el Cron de cPanel extrae y ejecuta
 * scripts/cpanel/post-deploy.sh en el servidor.
 */
final class DeployCpanelCommand extends Command
{
    protected $signature = 'deploy:cpanel
                            {--skip-build : Usa el .tar.gz existente sin regenerarlo}
                            {--skip-restore : No restaura composer (dev) tras el build}
                            {--skip-flag : No sube .deploy-pending (el Cron no se dispara)}
                            {--host= : Host cPanel (default: config cpanel.host)}
                            {--user= : Usuario cPanel (default: config cpanel.user)}
                            {--port= : Puerto UAPI (default: 2083)}
                            {--remote-dir= : Destino remoto (default: /home/{user}/parkingsoft)}
                            {--token= : API token (preferible CPANEL_API_TOKEN en .env)}
                            {--dry-run : Muestra la configuración y sale}';

    protected $description = 'Empaqueta y sube el backend a cPanel vía API token (+ flag para Cron post-deploy)';

    public function handle(): int
    {
        $apiDir = base_path();
        $buildScript = $apiDir.'/scripts/cpanel/build-production-package.sh';
        $uploadScript = $apiDir.'/scripts/cpanel/upload-via-token.sh';
        $packagePath = $apiDir.'/parkingsoft-api-production.tar.gz';

        if (! is_file($buildScript) || ! is_file($uploadScript)) {
            $this->error('No se encuentran los scripts en scripts/cpanel/.');

            return self::FAILURE;
        }

        $host = trim((string) ($this->option('host') ?: config('cpanel.host') ?: ''));
        $user = trim((string) ($this->option('user') ?: config('cpanel.user') ?: ''));
        $port = trim((string) ($this->option('port') ?: (string) config('cpanel.port') ?: '2083'));
        $remoteDir = trim((string) ($this->option('remote-dir') ?: config('cpanel.remote_dir') ?: ''));
        $token = trim((string) (
            $this->option('token')
            ?: config('cpanel.api_token')
            ?: env('CPANEL_API_TOKEN')
            ?: env('CPANEL_DEPLOY_TOKEN')
            ?: ''
        ));

        if ($this->option('dry-run')) {
            $this->info("Host: {$host}");
            $this->info("User: {$user}");
            $this->info("Port: {$port}");
            $this->info("Remote: {$remoteDir}");
            $this->info('Token: '.($token !== '' ? '(configurado)' : '(vacío)'));
            $this->info("Package: {$packagePath}");

            return self::SUCCESS;
        }

        if ($token === '') {
            $this->error('Falta el API token. Define CPANEL_API_TOKEN en .env o usa --token=...');
            $this->line('cPanel → Security → Manage API Tokens → Create');

            return self::FAILURE;
        }

        if ($host === '' || $user === '') {
            $this->error('Faltan CPANEL_HOST / CPANEL_USER (o --host / --user).');

            return self::FAILURE;
        }

        if ($remoteDir === '') {
            $remoteDir = '/home/'.$user.'/parkingsoft';
        }

        $this->info("Destino: {$user}@{$host}:{$port} → {$remoteDir}");

        $skipBuild = (bool) $this->option('skip-build');
        if (! $skipBuild) {
            $this->info('Generando paquete de producción...');
            if (! $this->runScript($buildScript, $apiDir, [])) {
                return self::FAILURE;
            }
            if (! (bool) $this->option('skip-restore')) {
                $this->info('Restaurando composer (dev) en local...');
                if (! $this->runComposerRestore($apiDir)) {
                    $this->warn('No se pudo restaurar composer; ejecuta: composer install');
                }
            }
        } elseif (! is_file($packagePath)) {
            $this->error("No existe {$packagePath}. Quita --skip-build o genera el paquete antes.");

            return self::FAILURE;
        }

        $this->info('Subiendo paquete (+ cron script + flag) con API token...');
        $env = [
            'CPANEL_HOST' => $host,
            'CPANEL_USER' => $user,
            'CPANEL_PORT' => $port,
            'CPANEL_API_TOKEN' => $token,
            'REMOTE_DIR' => $remoteDir,
            'PACKAGE_PATH' => $packagePath,
            'BUILD_PACKAGE' => 'false',
            'UPLOAD_PENDING_FLAG' => (bool) $this->option('skip-flag') ? 'false' : 'true',
        ];
        if (! $this->runScript($uploadScript, $apiDir, $env)) {
            $this->newLine();
            $this->warn('Si Imunify360 bloquea: allowlist tu IP (curl -s https://api.ipify.org).');

            return self::FAILURE;
        }

        $this->newLine();
        if ((bool) $this->option('skip-flag')) {
            $this->comment('Paquete subido sin flag. Extrae manualmente o vuelve a correr sin --skip-flag.');
        } else {
            $this->info('Paquete + .deploy-pending subidos.');
            $this->comment('Si el Cron está configurado, el servidor completará el deploy en ~1 minuto.');
            $this->line("  Cron: /bin/bash -c 'test -f {$remoteDir}/cron-deploy-pending.sh && exec /bin/bash {$remoteDir}/cron-deploy-pending.sh'");
            $this->line("  Log:  {$remoteDir}/storage/logs/deploy-cron.log");
            $this->line('  Health: curl -sS https://parkingsoft.davidortega.dev/api/v1/me');
            $this->newLine();
            $this->comment('Primera vez: configura el Cron en cPanel (ver backend/README.md).');
        }

        return self::SUCCESS;
    }

    /**
     * @param  array<string, string>  $env
     */
    private function runScript(string $script, string $cwd, array $env): bool
    {
        $result = Process::path($cwd)
            ->timeout(900)
            ->env($env)
            ->run(['bash', $script], function (string $type, string $output): void {
                $this->output->write($output);
            });

        if (! $result->successful()) {
            $this->error("Falló: {$script} (exit {$result->exitCode()})");

            return false;
        }

        return true;
    }

    private function runComposerRestore(string $apiDir): bool
    {
        $result = Process::path($apiDir)
            ->timeout(600)
            ->run(['composer', 'install', '--no-interaction'], function (string $type, string $output): void {
                $this->output->write($output);
            });

        return $result->successful();
    }
}
