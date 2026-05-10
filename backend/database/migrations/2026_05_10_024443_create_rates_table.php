<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rates', function (Blueprint $table) {
            $table->id();
            $table->string('vehicle_class', 32);
            $table->string('billing_mode', 32);
            $table->decimal('price', 12, 2);
            $table->string('currency', 8)->default('COP');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['vehicle_class', 'billing_mode']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rates');
    }
};
