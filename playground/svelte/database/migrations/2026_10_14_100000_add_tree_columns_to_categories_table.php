<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * alfasix/alfakit-tree: categories get a parent and an order column (HasTreeStructure),
 * shown by the CategoryTree page.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table): void {
            $table->foreignId('parent_id')->nullable()->after('id')->constrained('categories')->nullOnDelete();
            $table->integer('order')->default(0)->after('parent_id');
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('parent_id');
            $table->dropColumn('order');
        });
    }
};
