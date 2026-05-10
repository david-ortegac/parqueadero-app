<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureRole
{
    /**
     * Laravel separa por comas los parámetros del middleware (p. ej. role:admin,operator
     * llega como dos argumentos). Un solo string en la ruta equivale a un argumento.
     */
    public function handle(Request $request, Closure $next, string ...$roleSlugs): Response
    {
        $user = $request->user();
        if ($user === null) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        $allowed = [];
        foreach ($roleSlugs as $slug) {
            foreach (array_map('trim', explode(',', $slug)) as $r) {
                if ($r === '') {
                    continue;
                }
                $enum = UserRole::tryFrom($r);
                if ($enum !== null) {
                    $allowed[] = $enum;
                }
            }
        }

        if ($allowed === [] || ! $user->hasRole(...$allowed)) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        return $next($request);
    }
}
