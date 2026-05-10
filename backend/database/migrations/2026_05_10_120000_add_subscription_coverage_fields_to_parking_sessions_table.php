<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parking_sessions', function (Blueprint $table): void {
            $table->unsignedTinyInteger('subscription_entry_day')->nullable()->after('period_ends_at');
            $table->unsignedSmallInteger('subscription_period_days')->nullable()->after('subscription_entry_day');
        });
    }

    public function down(): void
    {
        Schema::table('parking_sessions', function (Blueprint $table): void {
            $table->dropColumn(['subscription_entry_day', 'subscription_period_days']);
        });
    }
};
