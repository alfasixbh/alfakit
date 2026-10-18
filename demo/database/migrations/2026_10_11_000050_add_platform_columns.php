<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Platform area: multi-factor authentication columns on users (TOTP secret, recovery codes,
 * email code) and the translatable storefront welcome message on settings.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->text('app_authentication_secret')->nullable();
            $table->text('app_authentication_recovery_codes')->nullable();
            $table->boolean('has_email_authentication')->default(false);
            $table->timestamp('invited_at')->nullable();
        });

        Schema::table('settings', function (Blueprint $table): void {
            $table->json('welcome_message')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['app_authentication_secret', 'app_authentication_recovery_codes', 'has_email_authentication', 'invited_at']);
        });

        Schema::table('settings', function (Blueprint $table): void {
            $table->dropColumn('welcome_message');
        });
    }
};
