<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\BillingMode;
use App\Enums\UserRole;
use App\Enums\VehicleClass;
use App\Models\CapacityConfig;
use App\Models\Rate;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'admin@parqueadero.local'],
            [
                'name' => 'Administrador',
                'password' => Hash::make('password'),
                'role' => UserRole::Admin->value,
                'is_active' => true,
            ]
        );

        User::query()->updateOrCreate(
            ['email' => 'operador@parqueadero.local'],
            [
                'name' => 'Operador',
                'password' => Hash::make('password'),
                'role' => UserRole::Operator->value,
                'is_active' => true,
            ]
        );

        User::query()->updateOrCreate(
            ['email' => 'propietario@parqueadero.local'],
            [
                'name' => 'Propietario demo',
                'password' => Hash::make('password'),
                'role' => UserRole::VehicleOwner->value,
                'is_active' => true,
            ]
        );

        CapacityConfig::query()->updateOrCreate(
            ['vehicle_class' => VehicleClass::Car->value],
            ['max_slots' => 50]
        );
        CapacityConfig::query()->updateOrCreate(
            ['vehicle_class' => VehicleClass::Motorcycle->value],
            ['max_slots' => 30]
        );

        foreach (VehicleClass::cases() as $class) {
            foreach (BillingMode::cases() as $mode) {
                Rate::query()->updateOrCreate(
                    [
                        'vehicle_class' => $class->value,
                        'billing_mode' => $mode->value,
                    ],
                    [
                        'price' => match ($mode) {
                            BillingMode::Minute => 200,
                            BillingMode::Hour => 5000,
                            BillingMode::Day => 35000,
                            BillingMode::Week => 150000,
                            BillingMode::Month => 450000,
                        },
                        'currency' => 'COP',
                        'is_active' => true,
                    ]
                );
            }
        }
    }
}
