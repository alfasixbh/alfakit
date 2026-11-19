<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The customer portal (/portal): customers (users flagged `is_customer`) and their orders.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('is_customer')->default(false);
        });

        Schema::create('orders', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('number')->unique();
            $table->string('status')->default('processing');
            $table->unsignedInteger('items_count')->default(1);
            $table->unsignedBigInteger('total');
            $table->string('currency', 3)->default('USD');
            $table->timestamp('placed_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('is_customer');
        });
    }
};
