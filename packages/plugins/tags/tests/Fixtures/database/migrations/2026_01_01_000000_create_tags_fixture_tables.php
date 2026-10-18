<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The AlfaKit fixtures have a plain `tags` table; Spatie's replaces it.
        Schema::dropIfExists('post_tag');
        Schema::dropIfExists('tags');

        (require dirname(__DIR__, 7).'/vendor/spatie/laravel-tags/database/migrations/create_tag_tables.php.stub')->up();

        Schema::create('articles', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->timestamps();
        });
    }
};
