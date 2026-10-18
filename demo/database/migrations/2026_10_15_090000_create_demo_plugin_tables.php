<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Demo tables and columns used by the first-party plugins: the order board's card order
 * (alfakit-kanban) and return requests with their approval workflow (alfakit-workflows).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->integer('board_sort')->nullable()->after('status');
        });

        Schema::create('return_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('requested_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('number')->unique();
            $table->string('reason');
            $table->text('details')->nullable();
            $table->decimal('amount', 10, 2);
            $table->string('state')->nullable();
            $table->string('refund_reference')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->timestamps();

            $table->index(['store_id', 'state']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('return_requests');

        Schema::table('orders', function (Blueprint $table): void {
            $table->dropColumn('board_sort');
        });
    }
};
