<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class ApiSecurityTest extends TestCase
{
    use RefreshDatabase;

    private const ADMIN_RATES_ENDPOINT = '/api/v1/admin/rates';

    public function test_unauthenticated_admin_routes_return_401(): void
    {
        $this->getJson(self::ADMIN_RATES_ENDPOINT)->assertUnauthorized();
    }

    public function test_unauthenticated_api_route_returns_json_for_browser_request(): void
    {
        $this->get(self::ADMIN_RATES_ENDPOINT, [
            'Accept' => 'text/html,application/xhtml+xml',
        ])
            ->assertUnauthorized()
            ->assertJson([
                'message' => 'Unauthenticated.',
            ]);
    }

    public function test_vehicle_owner_cannot_access_admin_rates(): void
    {
        $owner = User::factory()->create([
            'role' => UserRole::VehicleOwner->value,
            'is_active' => true,
            'document' => '1234567890',
        ]);

        Sanctum::actingAs($owner);

        $this->getJson(self::ADMIN_RATES_ENDPOINT)->assertForbidden();
    }

    public function test_operator_cannot_access_admin_rates(): void
    {
        $operator = User::factory()->create([
            'role' => UserRole::Operator->value,
            'is_active' => true,
        ]);

        Sanctum::actingAs($operator);

        $this->getJson(self::ADMIN_RATES_ENDPOINT)->assertForbidden();
    }

    public function test_admin_can_access_admin_rates(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::Admin->value,
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson(self::ADMIN_RATES_ENDPOINT)->assertOk();
    }

    public function test_vehicle_owner_cannot_access_operator_dashboard(): void
    {
        $owner = User::factory()->create([
            'role' => UserRole::VehicleOwner->value,
            'is_active' => true,
            'document' => '9876543210',
        ]);

        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/operator/dashboard')->assertForbidden();
    }

    public function test_login_returns_generic_message_for_invalid_credentials(): void
    {
        $response = $this->postJson('/api/v1/login', [
            'email' => 'noexiste@example.com',
            'password' => 'wrong-password-123',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['email']);
    }
}
