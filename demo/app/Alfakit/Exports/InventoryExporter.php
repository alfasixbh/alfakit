<?php

declare(strict_types=1);

namespace App\Alfakit\Exports;

use AlfaSix\Alfakit\Actions\Exports\ExportColumn;
use AlfaSix\Alfakit\Actions\Exports\Exporter;
use AlfaSix\Alfakit\Actions\Exports\Models\Export;
use App\Enums\ProductStatus;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;

/**
 * Export behind the inventory report: one row per product with stock, cost and value.
 */
class InventoryExporter extends Exporter
{
    protected static ?string $model = Product::class;

    public static function getColumns(): array
    {
        return [
            ExportColumn::make('sku')->label(__('platform.reports.inventory.columns.sku')),
            ExportColumn::make('name')->label(__('platform.reports.inventory.columns.product')),
            ExportColumn::make('brand.name')->label(__('platform.reports.inventory.columns.brand')),
            ExportColumn::make('category.name')->label(__('platform.reports.inventory.columns.category')),
            ExportColumn::make('status')
                ->label(__('platform.reports.inventory.columns.status'))
                ->formatStateUsing(fn (ProductStatus|string|null $state): string => $state instanceof ProductStatus ? $state->getLabel() : (string) $state),
            ExportColumn::make('stock')->label(__('platform.reports.inventory.columns.stock')),
            ExportColumn::make('cost')->label(__('platform.reports.inventory.columns.cost')),
            ExportColumn::make('stock_value')
                ->label(__('platform.reports.inventory.columns.value'))
                ->getStateUsing(fn (Product $record): string => number_format($record->stock * (float) ($record->cost ?? 0), 2, '.', '')),
            ExportColumn::make('price')->label(__('platform.reports.inventory.columns.price')),
            ExportColumn::make('compare_at_price')->label(__('platform.reports.inventory.columns.compare_at_price'))->enabledByDefault(false),
        ];
    }

    public static function modifyQuery(Builder $query): Builder
    {
        return $query->with(['brand:id,name', 'category:id,name']);
    }

    public function getFileName(Export $export): string
    {
        return 'maison-alfa-inventory-'.now()->format('Y-m-d');
    }
}
