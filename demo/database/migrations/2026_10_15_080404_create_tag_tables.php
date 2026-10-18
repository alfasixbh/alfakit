<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Demo: the catalogue already has a `tags` table (App\Models\Tag), so Spatie's tags
        // live in `spatie_tags` (App\Models\SpatieTag, config/tags.php).
        Schema::create('spatie_tags', function (Blueprint $table) {
            $table->id();

            $table->json('name');
            $table->json('slug');
            $table->string('type')->nullable();
            $table->integer('order_column')->nullable();

            $table->timestamps();
        });

        Schema::create('taggables', function (Blueprint $table) {
            $table->foreignId('tag_id')->constrained('spatie_tags')->cascadeOnDelete();

            $table->morphs('taggable');

            $table->unique(['tag_id', 'taggable_id', 'taggable_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('taggables');
        Schema::dropIfExists('spatie_tags');
    }
};
