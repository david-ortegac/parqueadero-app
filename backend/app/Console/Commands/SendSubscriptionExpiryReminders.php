<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\ParkingSession;
use App\Models\PushDevice;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Esqueleto para integración FCM: aquí se enviarían los pushes según tokens en push_devices.
 */
final class SendSubscriptionExpiryReminders extends Command
{
    protected $signature = 'parqueadero:subscription-reminders';

    protected $description = 'Evalúa períodos semanales/mensuales próximos a vencer y registra recordatorios (integrar FCM).';

    public function handle(): int
    {
        $now = CarbonImmutable::now();
        $twoDays = $now->addDays(2);

        $sessions = ParkingSession::query()
            ->where('status', 'active')
            ->whereNotNull('period_ends_at')
            ->where(function ($q) use ($now, $twoDays): void {
                $q->whereDate('period_ends_at', $twoDays->toDateString())
                    ->orWhereDate('period_ends_at', $now->toDateString());
            })
            ->with(['vehicle.owner.pushDevices'])
            ->get();

        foreach ($sessions as $session) {
            $ownerId = $session->vehicle?->owner_user_id;
            if ($ownerId === null) {
                continue;
            }

            $tokens = PushDevice::query()->where('user_id', $ownerId)->pluck('token');
            if ($tokens->isEmpty()) {
                continue;
            }

            Log::info('Recordatorio de vencimiento de suscripción', [
                'session_id' => $session->id,
                'tokens' => $tokens->count(),
                'period_ends_at' => $session->period_ends_at,
            ]);
        }

        $this->info('Proceso de recordatorios finalizado (logs).');

        return self::SUCCESS;
    }
}
