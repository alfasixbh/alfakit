<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('locale', 20)->nullable();
            $table->string('timezone', 64)->nullable();
        });

        Schema::table('posts', function (Blueprint $table): void {
            // Money is stored as an integer of the smallest unit (cents, fils, yen).
            $table->unsignedBigInteger('sponsorship_fee')->nullable();
            $table->char('currency', 3)->default('USD');
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table): void {
            $table->dropColumn(['sponsorship_fee', 'currency']);
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['locale', 'timezone']);
        });
    }
};
