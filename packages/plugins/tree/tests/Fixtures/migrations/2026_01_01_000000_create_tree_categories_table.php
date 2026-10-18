<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tree_categories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('team_id')->nullable();
            $table->foreignId('parent_id')->nullable();
            $table->integer('order')->default(0);
            $table->string('title');
            $table->timestamps();
        });
    }
};
