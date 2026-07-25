<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\File;
use RuntimeException;
use Symfony\Component\Process\Process;

/**
 * Construye el release en `build/`: copia los archivos necesarios, instala
 * dependencias de producción (`--no-dev`), aplana `public/` para cPanel y deja
 * únicamente el `.tar.gz` (los archivos sueltos se eliminan al comprimir).
 */
final class CpanelReleasePackager
{
    /**
     * @return array{path: string, bytes: int, files: int, composer: string}
     */
    public function package(string $sourceDirectory, string $outputArchive): array
    {
        $source = realpath($sourceDirectory);
        if ($source === false || ! is_dir($source)) {
            throw new RuntimeException("Directorio fuente inválido: {$sourceDirectory}");
        }

        $buildDirectory = $this->absolutePath(dirname($outputArchive));
        $this->assertSafeBuildDirectory($source, $buildDirectory);
        $staging = $buildDirectory.'/release';

        $this->resetBuildDirectory($buildDirectory);
        if (! mkdir($staging, 0755, true) && ! is_dir($staging)) {
            throw new RuntimeException("No se pudo crear: {$staging}");
        }

        $this->copySourceToStaging($source, $staging, $buildDirectory);
        $this->scrubStagingArtifacts($staging);
        $this->ensureStorageSkeleton($staging);
        $composerOutput = $this->installProductionDependencies($staging);
        if (config('cpanel-deploy.flat_public', false)) {
            $this->flattenPublicDirectory($staging);
        }
        $this->scrubStagingArtifacts($staging);
        $this->ensureStorageSkeleton($staging);
        $this->assertNoLocalEnv($staging);
        $this->assertNoAppleDoubleFiles($staging);
        $this->createTarArchive($staging, $outputArchive);
        $this->assertArchiveHasNoLocalEnv($outputArchive);
        $this->assertArchiveHasNoAppleDoubleFiles($outputArchive);

        File::deleteDirectory($staging);

        if (! is_file($outputArchive)) {
            throw new RuntimeException('No se pudo crear el archivo tar.gz.');
        }

        return [
            'path' => $outputArchive,
            'bytes' => (int) filesize($outputArchive),
            'files' => $this->countArchivedEntries($outputArchive),
            'composer' => $composerOutput,
        ];
    }

    /** Normaliza a ruta absoluta aunque el directorio todavía no exista. */
    private function absolutePath(string $path): string
    {
        $resolved = realpath($path);
        if ($resolved !== false) {
            return $resolved;
        }
        $parent = realpath(dirname($path));
        if ($parent === false) {
            throw new RuntimeException("Ruta inválida: {$path}");
        }

        return rtrim($parent, '/').'/'.basename($path);
    }

    /** El build se vacía por completo, así que nunca puede contener el código fuente. */
    private function assertSafeBuildDirectory(string $source, string $buildDirectory): void
    {
        if ($buildDirectory === $source || str_starts_with($source.'/', $buildDirectory.'/')) {
            throw new RuntimeException(
                "El directorio de build ({$buildDirectory}) contiene el código fuente ({$source}); elige otra ruta."
            );
        }
    }

    private function resetBuildDirectory(string $buildDirectory): void
    {
        if (is_dir($buildDirectory)) {
            File::deleteDirectory($buildDirectory);
        }
        if (! is_dir($buildDirectory) && ! mkdir($buildDirectory, 0755, true) && ! is_dir($buildDirectory)) {
            throw new RuntimeException("No se pudo crear el directorio de build: {$buildDirectory}");
        }
    }

    private function copySourceToStaging(string $source, string $staging, string $buildDirectory): void
    {
        $excludes = config('cpanel-deploy.package_excludes', []);
        if (str_starts_with($buildDirectory.'/', $source.'/')) {
            $excludes[] = trim(substr($buildDirectory, strlen($source)), '/');
        }
        $rsync = ['rsync', '-a', '--delete'];
        foreach ($excludes as $pattern) {
            $rsync[] = '--exclude='.$pattern;
        }
        $rsync[] = rtrim($source, '/').'/';
        $rsync[] = rtrim($staging, '/').'/';

        $process = new Process($rsync);
        $process->setTimeout(300);
        $process->run();

        if ($process->isSuccessful()) {
            $this->scrubStagingArtifacts($staging);

            return;
        }

        // Fallback sin rsync (p. ej. algunos entornos mínimos).
        File::copyDirectory($source, $staging);
        foreach ($excludes as $pattern) {
            $path = $staging.'/'.ltrim((string) $pattern, '/');
            if (is_dir($path)) {
                File::deleteDirectory($path);
            } elseif (is_file($path)) {
                @unlink($path);
            }
        }
        foreach (['vendor', '.git', 'node_modules', 'build'] as $dir) {
            if (is_dir($staging.'/'.$dir)) {
                File::deleteDirectory($staging.'/'.$dir);
            }
        }
        $this->scrubStagingArtifacts($staging);
    }

    /** Elimina secretos locales y basura de macOS (._* / .DS_Store). */
    private function scrubStagingArtifacts(string $staging): void
    {
        $this->scrubSecretsFromStaging($staging);
        $this->removeAppleDoubleFiles($staging);
    }

    /** Elimina .env local y archivos sensibles; conserva .env.example. */
    private function scrubSecretsFromStaging(string $staging): void
    {
        $forbiddenExact = [
            '.env',
            '.env.local',
            '.env.backup',
            '.env.production',
            '.env.staging',
            '.env.testing',
            'auth.json',
            '.DS_Store',
            'Thumbs.db',
        ];
        foreach ($forbiddenExact as $name) {
            $path = $staging.'/'.$name;
            if (is_file($path) || is_link($path)) {
                @unlink($path);
            }
        }

        foreach (glob($staging.'/.env.*') ?: [] as $path) {
            if (basename($path) === '.env.example') {
                continue;
            }
            if (is_file($path) || is_link($path)) {
                @unlink($path);
            }
        }

        foreach (['backend.zip', '*.zip', '*.tar.gz', '*.tgz'] as $pattern) {
            foreach (glob($staging.'/'.$pattern) ?: [] as $path) {
                if (is_file($path)) {
                    @unlink($path);
                }
            }
        }

        $cacheDir = $staging.'/bootstrap/cache';
        if (is_dir($cacheDir)) {
            foreach (glob($cacheDir.'/*.php') ?: [] as $cached) {
                // Conservar solo .gitignore; nunca llevar config/routes cacheados de otro entorno.
                if (basename($cached) === '.gitignore') {
                    continue;
                }
                @unlink($cached);
            }
        }
    }

    /** Borra recursivamente archivos AppleDouble (._*) y .DS_Store. */
    private function removeAppleDoubleFiles(string $staging): void
    {
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($staging, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );

        foreach ($iterator as $fileInfo) {
            /** @var \SplFileInfo $fileInfo */
            $name = $fileInfo->getFilename();
            if ($name === '.DS_Store' || $name === 'Thumbs.db' || str_starts_with($name, '._')) {
                if ($fileInfo->isDir()) {
                    File::deleteDirectory($fileInfo->getPathname());
                } else {
                    @unlink($fileInfo->getPathname());
                }
            }
        }
    }

    /**
     * Crea la estructura mínima de storage/bootstrap/cache (Laravel la exige
     * aunque el contenido de cache/views se excluya del paquete).
     */
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

    private function assertNoAppleDoubleFiles(string $staging): void
    {
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($staging, \FilesystemIterator::SKIP_DOTS),
        );
        foreach ($iterator as $fileInfo) {
            /** @var \SplFileInfo $fileInfo */
            $name = $fileInfo->getFilename();
            if ($name === '.DS_Store' || str_starts_with($name, '._')) {
                throw new RuntimeException("El release aún contiene basura de macOS: {$fileInfo->getPathname()}");
            }
        }
    }

    private function assertArchiveHasNoAppleDoubleFiles(string $archive): void
    {
        $process = new Process(['tar', '-tzf', $archive]);
        $process->setTimeout(300);
        $process->run();
        if (! $process->isSuccessful()) {
            throw new RuntimeException('No se pudo inspeccionar el tar.gz tras crearlo.');
        }
        foreach (explode("\n", $process->getOutput()) as $entry) {
            $entry = trim($entry);
            if ($entry === '') {
                continue;
            }
            $base = basename($entry);
            if ($base === '.DS_Store' || str_starts_with($base, '._')) {
                throw new RuntimeException("El tar.gz incluye basura de macOS: {$entry}");
            }
        }
    }

    private function assertNoLocalEnv(string $staging): void
    {
        if (is_file($staging.'/.env') || is_link($staging.'/.env')) {
            throw new RuntimeException('El release contiene .env local; abortando el empaquetado.');
        }
        foreach (glob($staging.'/.env.*') ?: [] as $path) {
            if (basename($path) === '.env.example') {
                continue;
            }
            throw new RuntimeException('El release contiene archivo de entorno local ('.basename($path).'); abortando.');
        }
    }

    private function assertArchiveHasNoLocalEnv(string $archive): void
    {
        $process = new Process(['tar', '-tzf', $archive]);
        $process->setTimeout(300);
        $process->run();
        if (! $process->isSuccessful()) {
            throw new RuntimeException('No se pudo inspeccionar el tar.gz tras crearlo.');
        }
        foreach (explode("\n", $process->getOutput()) as $entry) {
            $entry = trim($entry);
            if ($entry === '') {
                continue;
            }
            $base = basename($entry);
            if ($base === '.env' || (str_starts_with($base, '.env.') && $base !== '.env.example')) {
                throw new RuntimeException("El tar.gz incluye secreto local: {$entry}");
            }
            if (preg_match('/\.(zip|tar\.gz|tgz)$/i', $base) === 1) {
                throw new RuntimeException("El tar.gz incluye archivo comprimido anidado: {$entry}");
            }
        }
    }

    private function installProductionDependencies(string $staging): string
    {
        $composer = $this->resolveComposerCommand();
        $arguments = ['install', '--no-dev', '--optimize-autoloader', '--no-interaction', '--prefer-dist'];

        $process = new Process(array_merge($composer, $arguments), $staging);
        $process->setTimeout(900);
        $process->run();

        if (! $process->isSuccessful()) {
            // `post-autoload-dump` ejecuta artisan y puede fallar sin .env.
            $retry = new Process(array_merge($composer, $arguments, ['--no-scripts']), $staging);
            $retry->setTimeout(900);
            $retry->run();
            if (! $retry->isSuccessful()) {
                throw new RuntimeException(
                    'composer install --no-dev falló: '.trim($retry->getErrorOutput().' '.$retry->getOutput())
                );
            }
            $process = $retry;
        }

        if (! is_file($staging.'/vendor/autoload.php')) {
            throw new RuntimeException('composer install no generó vendor/autoload.php.');
        }

        return trim($process->getErrorOutput()."\n".$process->getOutput());
    }

    /**
     * @return list<string>
     */
    private function resolveComposerCommand(): array
    {
        $configured = (string) config('cpanel-deploy.composer_binary', 'composer');
        if ($configured !== '' && $configured !== 'composer' && is_file($configured)) {
            return str_ends_with($configured, '.phar') ? ['php', $configured] : [$configured];
        }

        $which = Process::fromShellCommandline('command -v '.escapeshellarg($configured ?: 'composer'));
        $which->run();
        if ($which->isSuccessful() && trim($which->getOutput()) !== '') {
            return [trim($which->getOutput())];
        }

        if (is_file(base_path('composer.phar'))) {
            return ['php', base_path('composer.phar')];
        }

        throw new RuntimeException(
            'No se encontró composer. Instálalo o define CPANEL_DEPLOY_COMPOSER_BINARY con la ruta.'
        );
    }

    private function flattenPublicDirectory(string $staging): void
    {
        $publicDir = $staging.'/public';
        if (! is_dir($publicDir)) {
            throw new RuntimeException('No existe public/ en el backend a empaquetar.');
        }

        $items = scandir($publicDir);
        if ($items === false) {
            throw new RuntimeException('No se pudo leer public/.');
        }
        foreach ($items as $name) {
            if ($name === '.' || $name === '..') {
                continue;
            }
            $from = $publicDir.'/'.$name;
            $to = $staging.'/'.$name;
            if (is_dir($from) && ! is_link($from)) {
                if (is_dir($to)) {
                    File::deleteDirectory($to);
                }
                File::copyDirectory($from, $to);
                continue;
            }
            if (! copy($from, $to)) {
                throw new RuntimeException("No se pudo copiar {$from} → {$to}");
            }
        }

        File::deleteDirectory($publicDir);

        $index = <<<'PHP'
<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

if (file_exists($maintenance = __DIR__.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require __DIR__.'/vendor/autoload.php';

/** @var Application $app */
$app = require_once __DIR__.'/bootstrap/app.php';

$app->handleRequest(Request::capture());

PHP;
        File::put($staging.'/index.php', $index);

        if (! is_file($staging.'/deploy-release.php')) {
            throw new RuntimeException('Falta deploy-release.php tras aplanar public/.');
        }
        if (! is_file($staging.'/.htaccess')) {
            throw new RuntimeException('Falta .htaccess tras aplanar public/.');
        }
    }

    private function createTarArchive(string $staging, string $outputArchive): void
    {
        $process = new Process(['tar', '-czf', $outputArchive, '-C', $staging, '.']);
        $process->setTimeout(900);
        // Evita que macOS meta archivos ._* / xattrs dentro del tar.
        $process->setEnv([
            'COPYFILE_DISABLE' => '1',
            'COPY_EXTENDED_ATTRIBUTES_DISABLE' => '1',
        ] + $_ENV + $_SERVER);
        $process->run();
        if (! $process->isSuccessful()) {
            throw new RuntimeException(
                'No se pudo crear el archivo tar.gz: '.trim($process->getErrorOutput().' '.$process->getOutput())
            );
        }
    }

    private function countArchivedEntries(string $archive): int
    {
        $process = new Process(['tar', '-tzf', $archive]);
        $process->setTimeout(300);
        $process->run();
        if (! $process->isSuccessful()) {
            return 0;
        }

        $lines = array_filter(explode("\n", trim($process->getOutput())));

        return count($lines);
    }
}
