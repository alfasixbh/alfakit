<?php

declare(strict_types=1);

namespace App\Alfakit\Exports;

use AlfaSix\Alfakit\Actions\Exports\ExportColumn;
use AlfaSix\Alfakit\Actions\Exports\Exporter;
use AlfaSix\Alfakit\Actions\Exports\Models\Export;
use App\Enums\Concentration;
use App\Enums\ProductStatus;
use App\Models\Product;

/**
 * CSV / XLSX export of the catalog. The columns mirror the importer so a file round-trips.
 */
class ProductExporter extends Exporter
{
    protected static ?string $model = Product::class;

    public static function getColumns(): array
    {
        return [
            ExportColumn::make('sku')->label(fn (): string => __('catalog.fields.sku')),
            ExportColumn::make('name')->label(fn (): string => __('catalog.fields.name')),
            ExportColumn::make('brand.name')->label(fn (): string => __('catalog.fields.brand')),
            ExportColumn::make('category.name')->label(fn (): string => __('catalog.fields.category')),
            ExportColumn::make('concentration')
                ->label(fn (): string => __('catalog.fields.concentration'))
                ->formatStateUsing(fn (Concentration|string|null $state): ?string => $state instanceof Concentration ? $state->value : $state),
            ExportColumn::make('size_ml')->label(fn (): string => __('catalog.fields.size_ml')),
            ExportColumn::make('price')->label(fn (): string => __('catalog.fields.price')),
            ExportColumn::make('compare_at_price')->label(fn (): string => __('catalog.fields.compare_at_price'))->enabledByDefault(false),
            ExportColumn::make('cost')->label(fn (): string => __('catalog.fields.cost')),
            ExportColumn::make('stock')->label(fn (): string => __('catalog.fields.stock')),
            ExportColumn::make('status')
                ->label(fn (): string => __('catalog.fields.status'))
                ->formatStateUsing(fn (ProductStatus|string|null $state): ?string => $state instanceof ProductStatus ? $state->value : $state),
            ExportColumn::make('featured')
                ->label(fn (): string => __('catalog.fields.featured'))
                ->formatStateUsing(fn (mixed $state): string => $state ? 'yes' : 'no'),
            ExportColumn::make('tags.name')->label(fn (): string => __('catalog.fields.tags'))->listSeparator(', ')->enabledByDefault(false),
            ExportColumn::make('reviews_count')->label(fn (): string => __('catalog.fields.reviews_count'))->counts('reviews')->enabledByDefault(false),
            ExportColumn::make('published_at')->label(fn (): string => __('catalog.fields.published_at'))->enabledByDefault(false),
        ];
    }

    public static function getCompletedNotificationBody(Export $export): string
    {
        return trans_choice('catalog.exporter.completed', $export->successful_rows, ['count' => number_format($export->successful_rows)]);
    }
}
