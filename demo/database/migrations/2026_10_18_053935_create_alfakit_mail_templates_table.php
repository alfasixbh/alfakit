<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Edited mail templates: one row per mail and locale. A null subject or body keeps the
 * mail's own. Their history lives in `alfakit_record_versions` (publish it with
 * `vendor:publish --tag=alfakit-record-versions-migrations`).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alfakit_mail_templates', function (Blueprint $table): void {
            $table->id();
            $table->string('key');
            $table->string('locale', 20);
            $table->string('subject')->nullable();
            $table->longText('body')->nullable();
            $table->timestamps();

            $table->unique(['key', 'locale']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alfakit_mail_templates');
    }
};
