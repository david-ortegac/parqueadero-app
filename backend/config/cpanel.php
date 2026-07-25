<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Despliegue a cPanel (API token)
    |--------------------------------------------------------------------------
    |
    | Usado por `php artisan deploy:cpanel`. El token solo sube el .tar.gz
    | (Fileman::upload_files). El Cron del servidor extrae y corre post-deploy.
    |
    */

    'host' => env('CPANEL_HOST', 'davidortega.dev'),

    'user' => env('CPANEL_USER', 'davidort'),

    'port' => (int) env('CPANEL_PORT', 2083),

    'remote_dir' => env('CPANEL_REMOTE_DIR', '/home/davidort/parkingsoft'),

    'api_token' => env('CPANEL_API_TOKEN'),

];
