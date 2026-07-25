<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class VerifyCpanelDeployToken
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('cpanel-deploy.enabled')) {
            abort(404);
        }

        $expected = (string) config('cpanel-deploy.token');
        if ($expected === '') {
            abort(503, 'Deploy token is not configured.');
        }

        $provided = (string) (
            $request->header('X-Deploy-Token')
            ?? $request->query('token', '')
        );

        if ($provided === '' || ! hash_equals($expected, $provided)) {
            abort(401, 'Invalid deploy token.');
        }

        return $next($request);
    }
}
