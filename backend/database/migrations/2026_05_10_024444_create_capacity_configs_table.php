<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('capacity_configs', function (Blueprint $table) {
            $table->id();
            $table->string('vehicle_class', 32);
            $table->unsignedInteger('max_slots');
            $table->timestamps();

            $table->unique(['vehicle_class']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('capacity_configs');
    }
};
