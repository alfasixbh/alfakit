<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tenants. Every user belongs to several stores through store_user with a role.
        Schema::create('stores', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('tagline')->nullable();
            $table->string('country', 2)->default('BH');
            $table->string('city')->nullable();
            $table->string('currency', 3)->default('USD');
            $table->string('timezone', 64)->default('Asia/Bahrain');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('brand_color', 7)->default('#073B78');
            $table->string('logo_path')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('store_user', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 20)->default('staff');
            $table->timestamps();
            $table->unique(['store_id', 'user_id']);
        });

        // One settings row per store, edited through a singular resource.
        Schema::create('settings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('support_email')->nullable();
            $table->string('support_phone')->nullable();
            $table->string('order_prefix', 8)->default('MA');
            $table->unsignedInteger('low_stock_threshold')->default(5);
            $table->decimal('free_shipping_threshold', 10, 2)->default(120);
            $table->decimal('tax_rate', 5, 2)->default(10);
            $table->boolean('notify_on_new_order')->default(true);
            $table->boolean('reviews_require_approval')->default(true);
            $table->text('announcement')->nullable();
            $table->json('social')->nullable();
            $table->json('opening_hours')->nullable();
            $table->timestamps();
            $table->unique('store_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
        Schema::dropIfExists('store_user');
        Schema::dropIfExists('stores');
    }
};
