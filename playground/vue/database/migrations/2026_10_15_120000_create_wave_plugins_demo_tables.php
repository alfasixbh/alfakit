<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Demo tables for the second wave of first-party plugins: a Lucide icon per category
 * (IconPicker) and expense claims with an approval workflow (alfasix/alfakit-workflows).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table): void {
            $table->string('icon')->nullable();
        });

        Schema::create('expenses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->unsignedInteger('amount')->default(0);
            $table->string('currency', 3)->default('USD');
            $table->string('state')->nullable();
            $table->string('payment_reference')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');

        Schema::table('categories', function (Blueprint $table): void {
            $table->dropColumn('icon');
        });
    }
};
