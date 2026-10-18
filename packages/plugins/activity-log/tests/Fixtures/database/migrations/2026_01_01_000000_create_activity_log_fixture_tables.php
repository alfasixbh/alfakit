<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // spatie/laravel-activitylog v5: database/migrations/create_activity_log_table.php.stub
        Schema::create('activity_log', function (Blueprint $table): void {
            $table->id();
            $table->string('log_name')->nullable()->index();
            $table->text('description');
            $table->nullableMorphs('subject', 'subject');
            $table->string('event')->nullable();
            $table->nullableMorphs('causer', 'causer');
            $table->json('attribute_changes')->nullable();
            $table->json('properties')->nullable();
            $table->timestamps();
        });

        Schema::create('activity_articles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('team_id')->nullable();
            $table->string('title');
            $table->string('status')->default('draft');
            $table->timestamps();
        });

        Schema::create('activity_notes', function (Blueprint $table): void {
            $table->id();
            $table->string('body');
            $table->timestamps();
        });
    }
};
