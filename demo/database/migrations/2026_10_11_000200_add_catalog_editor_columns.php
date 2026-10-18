<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Columns the catalog editor needs on top of the base product table: translated copy,
 * page sections (Builder), free-form attributes (KeyValue), the review rating threshold
 * (Slider), SEO fields and a self-referencing "related products" pivot (ModalTableSelect).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->json('name_translations')->nullable()->after('name');
            $table->json('description_translations')->nullable()->after('description');
            $table->json('sections')->nullable()->after('images');
            $table->json('specifications')->nullable()->after('sections');
            $table->unsignedTinyInteger('min_review_rating')->default(1)->after('specifications');
            $table->string('meta_title')->nullable()->after('min_review_rating');
            $table->string('meta_description', 320)->nullable()->after('meta_title');
        });

        Schema::create('product_relations', function (Blueprint $table): void {
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('related_product_id')->constrained('products')->cascadeOnDelete();
            $table->primary(['product_id', 'related_product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_relations');

        Schema::table('products', function (Blueprint $table): void {
            $table->dropColumn(['name_translations', 'description_translations', 'sections', 'specifications', 'min_review_rating', 'meta_title', 'meta_description']);
        });
    }
};
