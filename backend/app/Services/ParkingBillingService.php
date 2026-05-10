<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\BillingMode;
use App\Models\ParkingSession;
use App\Models\Rate;
use Carbon\CarbonImmutable;

final class ParkingBillingService
{
    public function calculateCheckoutAmount(ParkingSession $session): string
    {
        $mode = BillingMode::tryFrom($session->billing_mode);
        if ($mode === null) {
            return '0.00';
        }

        $vehicle = $session->vehicle;
        $rate = Rate::query()
            ->where('vehicle_class', $vehicle->vehicle_class)
            ->where('billing_mode', $session->billing_mode)
            ->where('is_active', true)
            ->first();

        if ($rate === null) {
            return '0.00';
        }

        $price = (float) $rate->price;
        $exit = CarbonImmutable::now();
        $entry = CarbonImmutable::parse((string) $session->entered_at);
        $minutes = max(1, (int) ceil($entry->diffInMinutes($exit)));
        $hours = max(1, (int) ceil($entry->diffInHours($exit)));
        $days = max(1, (int) ceil($minutes / (24 * 60)));

        return match ($mode) {
            BillingMode::Minute => number_format($minutes * $price, 2, '.', ''),
            BillingMode::Hour => number_format($hours * $price, 2, '.', ''),
            BillingMode::Day => number_format($days * $price, 2, '.', ''),
            BillingMode::Week, BillingMode::Month => number_format($price, 2, '.', ''),
        };
    }

    public function subscriptionEndsAt(BillingMode $mode, CarbonImmutable $start): CarbonImmutable
    {
        return match ($mode) {
            BillingMode::Week => $start->addWeek(),
            BillingMode::Month => $start->addMonth(),
            default => $start,
        };
    }
}
