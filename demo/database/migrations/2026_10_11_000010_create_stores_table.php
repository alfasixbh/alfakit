<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tenants. Every user belongs to several stores through team_user with a role: the
        // stores are the teams of the Teams plugin (members, invitations, roles).
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
            // Columns the Teams plugin reads on its team model (IsTeam).
            $table->boolean('personal_team')->default(false);
            $table->string('auto_join_domain')->nullable()->index();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // The Teams plugin's membership table, keyed by store (`team_id`).
        Schema::create('team_user', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('team_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 64)->default('staff');
            $table->timestamps();
            $table->unique(['team_id', 'user_id']);
        });

        Schema::create('team_invitations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('team_id')->constrained('stores')->cascadeOnDelete();
            $table->string('email');
            $table->string('role', 64);
            $table->foreignId('invited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->unique(['team_id', 'email']);
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->foreignId('current_team_id')->nullable()->constrained('stores')->nullOnDelete();
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
        Schema::table('users', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('current_team_id');
        });
        Schema::dropIfExists('team_invitations');
        Schema::dropIfExists('team_user');
        Schema::dropIfExists('stores');
    }
};
