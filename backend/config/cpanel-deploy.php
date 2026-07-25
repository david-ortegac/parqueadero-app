<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | cPanel deploy
    |--------------------------------------------------------------------------
    |
    | Flujo: `php artisan deploy:cpanel` reconstruye `build/`, instala
    | dependencias sin dev, comprime todo en un único .tar.gz, lo sube al
    | endpoint remoto, preserva .env + storage, reemplaza
    | /home/davidort/parkinsoft y corre migrate/caches.
    |
    */

    'enabled' => (bool) env('CPANEL_DEPLOY_ENABLED', false),

    'token' => env('CPANEL_DEPLOY_TOKEN'),

    /** Si true, el tar.gz deja index.php en la raíz (sin carpeta public/). */
    'flat_public' => (bool) env('CPANEL_DEPLOY_FLAT_PUBLIC', false),

    'url' => env('CPANEL_DEPLOY_URL', 'https://parkingsoft.davidortega.dev/deploy-release.php'),

    /**
     * Endpoint Laravel opcional (cuando ya está el código nuevo en el servidor).
     * Si está vacío, solo se usa CPANEL_DEPLOY_URL (bootstrap PHP).
     */
    'laravel_release_url' => env('CPANEL_DEPLOY_LARAVEL_URL', 'https://parkingsoft.davidortega.dev/cpanel-deploy/release'),

    'timeout_seconds' => (int) env('CPANEL_DEPLOY_TIMEOUT', 600),

    /** Ruta absoluta en el servidor cPanel donde vive Laravel. */
    'remote_path' => env('CPANEL_DEPLOY_PATH', '/home/davidort/parkingsoft'),

    /**
     * Directorio local a empaquetar (ruta absoluta o relativa al backend).
     * Por defecto: la raíz de esta app Laravel (base_path()).
     */
    'source_path' => env('CPANEL_DEPLOY_SOURCE', null),

    /**
     * Carpeta de build local. Se elimina y se recrea en cada `deploy:cpanel`;
     * al terminar solo contiene el archivo comprimido.
     */
    'build_path' => env('CPANEL_DEPLOY_BUILD_PATH', 'build'),

    'archive_name' => env('CPANEL_DEPLOY_ARCHIVE_NAME', 'parkinsoft-release.tar.gz'),

    /** Ruta a composer si no está en el PATH (acepta binario o .phar). */
    'composer_binary' => env('CPANEL_DEPLOY_COMPOSER_BINARY', 'composer'),

    /** El vendor ya viaja dentro del tar.gz, así que no hace falta en el servidor. */
    'run_composer' => (bool) env('CPANEL_DEPLOY_RUN_COMPOSER', false),

    'require_composer' => (bool) env('CPANEL_DEPLOY_REQUIRE_COMPOSER', false),

    'run_pipeline_after_swap' => (bool) env('CPANEL_DEPLOY_RUN_PIPELINE', true),

    'package_excludes' => [
        '.env',
        '.env.local',
        '.env.backup',
        '.env.production',
        '.env.staging',
        '.env.testing',
        '.git',
        '.github',
        '.idea',
        '.vscode',
        'node_modules',
        'vendor',
        'build',
        'bootstrap/cache/*.php',
        'bootstrap/cache/config.php',
        'bootstrap/cache/routes-*.php',
        'bootstrap/cache/events.php',
        'bootstrap/cache/services.php',
        'bootstrap/cache/packages.php',
        'storage/logs',
        'storage/framework/cache',
        'storage/framework/sessions',
        'storage/framework/views',
        'storage/app/deploy',
        'storage/app/private',
        'storage/app/public',
        '.phpunit.result.cache',
        'Homestead.json',
        'Homestead.yaml',
        'auth.json',
        'backend.zip',
        '*.zip',
        '*.tar',
        '*.tar.gz',
        '*.tgz',
        '._*',
        '.DS_Store',
        'Thumbs.db',
    ],

    'steps' => [
        'optimize_clear' => true,
        'migrate' => true,
        'storage_link' => true,
        'config_cache' => true,
        'route_cache' => false,
        'view_cache' => true,
        'event_cache' => false,
    ],

];
