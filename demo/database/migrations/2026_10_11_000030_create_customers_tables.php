<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('locale', 12)->default('en');
            $table->string('country', 2)->default('BH');
            $table->date('birthday')->nullable();
            $table->boolean('accepts_marketing')->default(false);
            $table->boolean('is_vip')->default(false);
            $table->text('notes')->nullable();
            $table->string('avatar_path')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['store_id', 'email']);
        });

        Schema::create('addresses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->string('label')->nullable();
            $table->string('type', 16)->default('shipping');
            $table->string('recipient');
            $table->string('line1');
            $table->string('line2')->nullable();
            $table->string('city');
            $table->string('state')->nullable();
            $table->string('postal_code')->nullable();
            $table->string('country', 2);
            $table->string('phone')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('addresses');
        Schema::dropIfExists('customers');
    }
};
