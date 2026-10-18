<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The 1,000,000-row benchmark table (benchmarks/README.md, "1M rows"). Indexed: sku (search
 * prefix), status (filter), created_at (indexed sort). unit_price is deliberately unindexed.
 * Keep in sync with benchmarks/filament-app.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bench_big_records', function (Blueprint $table): void {
            $table->id();
            $table->string('sku', 16)->unique();
            $table->string('name');
            $table->string('status', 16)->index();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 10, 2);
            $table->timestamp('created_at')->nullable()->index();
            $table->timestamp('updated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bench_big_records');
    }
};
