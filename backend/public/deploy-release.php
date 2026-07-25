<?php

declare(strict_types=1);

/**
 * Bootstrap de deploy para cPanel (primer carga / File Manager).
 *
 * Sube ESTE archivo una sola vez a:
 *   /home/davidort/parkinsoft/deploy-release.php
 *
 * (Document Root del subdominio = /home/davidort/parkinsoft, sin carpeta public/)
 *
 * Luego desde local:
 *   php artisan deploy:cpanel
 *
 * Autenticación: header X-Deploy-Token o ?token= (mismo CPANEL_DEPLOY_TOKEN del .env).
 */

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'ok' => true,
        'message' => 'deploy-release bootstrap listo. Usa POST multipart field "archive".',
        'target' => dirname(__DIR__),
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

$root = (is_file(__DIR__.'/artisan') || is_file(__DIR__.'/.env'))
    ? __DIR__
    : dirname(__DIR__);
$tokenExpected = deploy_read_env_value($root.'/.env', 'CPANEL_DEPLOY_TOKEN');
$enabled = strtolower((string) deploy_read_env_value($root.'/.env', 'CPANEL_DEPLOY_ENABLED')) === 'true';
$pathExpected = deploy_read_env_value($root.'/.env', 'CPANEL_DEPLOY_PATH') ?: $root;

if (! $enabled) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'message' => 'CPANEL_DEPLOY_ENABLED no es true en el servidor.']);
    exit;
}

if ($tokenExpected === null || $tokenExpected === '') {
    http_response_code(503);
    echo json_encode(['ok' => false, 'message' => 'CPANEL_DEPLOY_TOKEN no configurado en .env del servidor.']);
    exit;
}

$provided = $_SERVER['HTTP_X_DEPLOY_TOKEN'] ?? ($_GET['token'] ?? '');
if (! is_string($provided) || $provided === '' || ! hash_equals($tokenExpected, $provided)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'message' => 'Invalid deploy token.']);
    exit;
}

$configuredReal = realpath($pathExpected) ?: rtrim((string) $pathExpected, '/');
$rootReal = realpath($root) ?: $root;
if ($configuredReal !== $rootReal) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'message' => "CPANEL_DEPLOY_PATH ({$pathExpected}) no coincide con {$rootReal}",
    ]);
    exit;
}

if (! isset($_FILES['archive']) || ! is_array($_FILES['archive'])) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Falta el archivo archive.']);
    exit;
}

$file = $_FILES['archive'];
$uploadError = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
if ($uploadError !== UPLOAD_ERR_OK) {
    http_response_code(422);
    echo json_encode([
        'ok' => false,
        'message' => deploy_upload_error_message($uploadError),
        'php_upload_error' => $uploadError,
        'upload_max_filesize' => ini_get('upload_max_filesize'),
        'post_max_size' => ini_get('post_max_size'),
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

$original = strtolower((string) ($file['name'] ?? ''));
if (! str_ends_with($original, '.tar.gz') && ! str_ends_with($original, '.tgz')) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Solo se acepta .tar.gz']);
    exit;
}

$parent = dirname($rootReal);
$release = $parent.'/'.basename($rootReal).'_release';
$previous = $parent.'/'.basename($rootReal).'_previous';
$incomingDir = $rootReal.'/storage/app/deploy';
if (! is_dir($incomingDir) && ! mkdir($incomingDir, 0755, true) && ! is_dir($incomingDir)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'No se pudo crear storage/app/deploy']);
    exit;
}

$archivePath = $incomingDir.'/incoming-'.uniqid('rel_', true).'.tar.gz';
if (! move_uploaded_file((string) $file['tmp_name'], $archivePath)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'No se pudo guardar el archive.']);
    exit;
}

try {
    deploy_reset_dir($release);
    deploy_run(['tar', '-xzf', $archivePath, '-C', $release]);
    foreach (['artisan', 'composer.json'] as $required) {
        if (! is_file($release.'/'.$required)) {
            throw new RuntimeException("Archive inválido (falta {$required}).");
        }
    }
    if (! is_file($release.'/index.php') && ! is_file($release.'/public/index.php')) {
        throw new RuntimeException('Archive inválido (falta index.php).');
    }

    // Preservar .env y storage vivos.
    if (is_file($rootReal.'/.env')) {
        if (! copy($rootReal.'/.env', $release.'/.env')) {
            throw new RuntimeException('No se pudo copiar .env al release.');
        }
    }
    if (is_dir($rootReal.'/storage')) {
        deploy_copy_dir($rootReal.'/storage', $release.'/storage');
        $deployTrash = $release.'/storage/app/deploy';
        if (is_dir($deployTrash)) {
            deploy_delete_dir($deployTrash);
        }
    }
    deploy_ensure_storage_skeleton($release);

    $composer = deploy_composer($release);

    if (is_dir($previous)) {
        deploy_delete_dir($previous);
    }
    if (! rename($rootReal, $previous)) {
        throw new RuntimeException("No se pudo renombrar live -> previous");
    }
    if (! rename($release, $rootReal)) {
        @rename($previous, $rootReal);
        throw new RuntimeException("No se pudo renombrar release -> live");
    }

    deploy_ensure_storage_skeleton($rootReal);

    @unlink($archivePath);

    $pipeline = deploy_pipeline($rootReal);

    $ok = $pipeline['ok'];
    echo json_encode([
        'ok' => $ok,
        'message' => $ok ? 'Release instalado y reemplazo completado.' : 'Release instalado con errores en pasos posteriores.',
        'target' => $rootReal,
        'previous' => $previous,
        'composer' => $composer,
        'pipeline' => $pipeline,
        'bootstrap' => true,
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    if (is_file($archivePath)) {
        @unlink($archivePath);
    }
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_SLASHES);
}

function deploy_upload_error_message(int $code): string
{
    return match ($code) {
        UPLOAD_ERR_INI_SIZE => 'El .tar.gz supera upload_max_filesize del servidor (PHP error 1). En cPanel → MultiPHP INI Editor sube upload_max_filesize y post_max_size a 64M o más.',
        UPLOAD_ERR_FORM_SIZE => 'El archivo supera el MAX_FILE_SIZE del formulario (PHP error 2).',
        UPLOAD_ERR_PARTIAL => 'El archivo se subió solo parcialmente (PHP error 3). Reintenta.',
        UPLOAD_ERR_NO_FILE => 'No se recibió el archivo archive (PHP error 4).',
        UPLOAD_ERR_NO_TMP_DIR => 'Falta carpeta temporal en el servidor (PHP error 6).',
        UPLOAD_ERR_CANT_WRITE => 'No se pudo escribir el archivo en disco (PHP error 7).',
        UPLOAD_ERR_EXTENSION => 'Una extensión PHP bloqueó el upload (PHP error 8).',
        default => 'Error de upload PHP: '.$code,
    };
}

function deploy_ensure_storage_skeleton(string $root): void
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
            file_put_contents($keep, "*\n!.gitignore\n");
        }
    }
}

function deploy_read_env_value(string $envPath, string $key): ?string
{
    if (! is_file($envPath)) {
        return null;
    }
    $lines = file($envPath, FILE_IGNORE_NEW_LINES);
    if ($lines === false) {
        return null;
    }
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || ! str_contains($line, '=')) {
            continue;
        }
        [$k, $v] = explode('=', $line, 2);
        if (trim($k) !== $key) {
            continue;
        }
        $v = trim($v);
        if (
            (str_starts_with($v, '"') && str_ends_with($v, '"'))
            || (str_starts_with($v, "'") && str_ends_with($v, "'"))
        ) {
            $v = substr($v, 1, -1);
        }

        return $v;
    }

    return null;
}

/**
 * @param  list<string>  $command
 */
function deploy_run(array $command, ?string $cwd = null): string
{
    $descriptors = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];
    $proc = proc_open($command, $descriptors, $pipes, $cwd);
    if (! is_resource($proc)) {
        throw new RuntimeException('No se pudo ejecutar: '.implode(' ', $command));
    }
    fclose($pipes[0]);
    $stdout = stream_get_contents($pipes[1]) ?: '';
    $stderr = stream_get_contents($pipes[2]) ?: '';
    fclose($pipes[1]);
    fclose($pipes[2]);
    $code = proc_close($proc);
    if ($code !== 0) {
        throw new RuntimeException(trim($stderr.' '.$stdout) ?: 'exit '.$code);
    }

    return trim($stdout.' '.$stderr);
}

/**
 * @return array{ok: bool, output: string}
 */
function deploy_composer(string $release): array
{
    if (is_file($release.'/vendor/autoload.php')) {
        return ['ok' => true, 'output' => 'vendor incluido en el release (sin dependencias dev).'];
    }

    $commands = [
        ['composer', 'install', '--no-dev', '--optimize-autoloader', '--no-interaction'],
        ['php', $release.'/composer.phar', 'install', '--no-dev', '--optimize-autoloader', '--no-interaction'],
    ];
    foreach ($commands as $command) {
        if ($command[0] === 'composer') {
            $which = @proc_open(['bash', '-lc', 'command -v composer'], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
            if (! is_resource($which)) {
                continue;
            }
            $path = trim(stream_get_contents($pipes[1]) ?: '');
            fclose($pipes[1]);
            fclose($pipes[2]);
            proc_close($which);
            if ($path === '') {
                continue;
            }
        }
        if ($command[0] === 'php' && ! is_file($release.'/composer.phar')) {
            continue;
        }
        try {
            $out = deploy_run($command, $release);

            return ['ok' => true, 'output' => $out];
        } catch (Throwable $e) {
            return ['ok' => false, 'output' => $e->getMessage()];
        }
    }

    return ['ok' => false, 'output' => 'composer no disponible'];
}

/**
 * @return array{ok: bool, steps: list<array{name: string, ok: bool, output: string}>}
 */
function deploy_pipeline(string $target): array
{
    $artisan = $target.'/artisan';
    $steps = [
        'optimize_clear' => ['php', $artisan, 'optimize:clear'],
        'migrate' => ['php', $artisan, 'migrate', '--force'],
        'storage_link' => ['php', $artisan, 'storage:link', '--force'],
        'config_cache' => ['php', $artisan, 'config:cache'],
        'view_cache' => ['php', $artisan, 'view:cache'],
    ];
    $results = [];
    $allOk = true;
    foreach ($steps as $name => $command) {
        try {
            $out = deploy_run($command, $target);
            $results[] = ['name' => $name, 'ok' => true, 'output' => $out];
        } catch (Throwable $e) {
            $allOk = false;
            $results[] = ['name' => $name, 'ok' => false, 'output' => $e->getMessage()];
        }
    }

    return ['ok' => $allOk, 'steps' => $results];
}

function deploy_reset_dir(string $path): void
{
    if (is_dir($path)) {
        deploy_delete_dir($path);
    }
    if (! mkdir($path, 0755, true) && ! is_dir($path)) {
        throw new RuntimeException("No se pudo crear {$path}");
    }
}

function deploy_delete_dir(string $path): void
{
    if (! is_dir($path)) {
        return;
    }
    $items = scandir($path);
    if ($items === false) {
        return;
    }
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $full = $path.'/'.$item;
        if (is_dir($full) && ! is_link($full)) {
            deploy_delete_dir($full);
        } else {
            @unlink($full);
        }
    }
    @rmdir($path);
}

function deploy_copy_dir(string $src, string $dst): void
{
    if (is_dir($dst)) {
        deploy_delete_dir($dst);
    }
    if (! mkdir($dst, 0755, true) && ! is_dir($dst)) {
        throw new RuntimeException("No se pudo crear {$dst}");
    }
    $items = scandir($src);
    if ($items === false) {
        return;
    }
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $from = $src.'/'.$item;
        $to = $dst.'/'.$item;
        if (is_dir($from) && ! is_link($from)) {
            deploy_copy_dir($from, $to);
        } else {
            if (! copy($from, $to)) {
                throw new RuntimeException("No se pudo copiar {$from}");
            }
        }
    }
}
