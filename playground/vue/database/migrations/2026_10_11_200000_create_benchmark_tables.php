<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Benchmark scenario (see /benchmarks/README.md). The same migration exists in
 * benchmarks/filament-app so both apps run against identical tables and data.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('benchmark_vendors', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->timestamps();
        });

        Schema::create('benchmark_regions', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('code', 4);
            $table->timestamps();
        });

        Schema::create('benchmark_records', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('vendor_id')->constrained('benchmark_vendors')->cascadeOnDelete();
            $table->foreignId('region_id')->constrained('benchmark_regions')->cascadeOnDelete();
            $table->string('sku', 16)->unique();
            $table->string('name');
            $table->string('status', 16)->default('draft');
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('quantity')->default(0);
            $table->decimal('unit_price', 10, 2)->default(0);
            $table->decimal('weight', 8, 2)->default(0);
            $table->decimal('rating', 2, 1)->nullable();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamps();

            $table->index('name');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('benchmark_records');
        Schema::dropIfExists('benchmark_regions');
        Schema::dropIfExists('benchmark_vendors');
    }
};
