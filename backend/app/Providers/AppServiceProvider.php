<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        if ($this->isFlatCpanelLayout()) {
            $this->app->usePublicPath(base_path());
        }
    }

    public function boot(): void
    {
        RateLimiter::for('auth-login', function (Request $request): Limit {
            $email = (string) $request->input('email', '');

            return Limit::perMinute(10)->by($request->ip().'|'.$email);
        });

        RateLimiter::for('auth-register', function (Request $request): Limit {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('public-plate-lookup', function (Request $request): Limit {
            return Limit::perMinute(30)->by($request->ip());
        });
    }

    private function isFlatCpanelLayout(): bool
    {
        return is_file(base_path('index.php'))
            && is_file(base_path('artisan'))
            && ! is_dir(base_path('public'));
    }
}
