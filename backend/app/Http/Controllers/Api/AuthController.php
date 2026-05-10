<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

final class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()->where('email', $credentials['email'])->first();
        if ($user === null || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Las credenciales no coinciden.'],
            ]);
        }

        if (! $user->is_active) {
            return response()->json(['message' => 'Usuario inactivo. Contacte al administrador.'], 403);
        }

        $user->tokens()->delete();
        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'document' => $user->document,
                'role' => $user->role,
            ],
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'document' => ['required', 'string', 'max:64'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $document = preg_replace('/\D+/', '', $data['document']);
        if ($document === '') {
            throw ValidationException::withMessages([
                'document' => ['El documento debe contener al menos un dígito.'],
            ]);
        }

        if (strlen($document) > 15) {
            throw ValidationException::withMessages([
                'document' => ['El documento admite como máximo 15 dígitos.'],
            ]);
        }

        if (User::query()->where('document', $document)->exists()) {
            throw ValidationException::withMessages([
                'document' => ['Este documento ya está registrado.'],
            ]);
        }

        $user = User::query()->create([
            'name' => trim($data['name']),
            'email' => $data['email'],
            'document' => $document,
            'password' => Hash::make($data['password']),
            'role' => UserRole::VehicleOwner->value,
            'is_active' => false,
        ]);

        return response()->json([
            'message' => 'Registro recibido. Un administrador u operador debe activar tu cuenta para iniciar sesión.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'document' => $user->document,
                'role' => $user->role,
                'is_active' => $user->is_active,
            ],
        ], 201);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Sesión cerrada.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'document' => $user->document,
            'role' => $user->role,
            'is_active' => $user->is_active,
        ]);
    }
}
