<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\OrderResource;

use AlfaSix\Alfakit\Tables\Columns\ImageColumn;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Table;
use App\Enums\Concentration;
use App\Enums\ProductStatus;
use App\Models\Product;

/**
 * The table shown by `ModalTableSelect::make('product_id')->tableConfiguration(ProductPicker::class)`
 * when adding items to an order: active products of the store with search, brand filter and price.
 */
final class ProductPicker
{
    public static function configure(Table $table): Table
    {
        return $table
            // No relationship on the field: the picker lists active products of the store (tenant scoped by the field).
            ->query(Product::query()->where('status', ProductStatus::Active)->with(['brand', 'category']))
            ->columns([
                ImageColumn::make('images')->label('')->disk('demo')->square()->size(40)->limit(1)->limitedRemainingText(false),
                TextColumn::make('name')
                    ->label(__('sales.fields.product'))
                    ->description(fn (Product $record): ?string => $record->brand?->name)
                    ->searchable()
                    ->sortable(),
                TextColumn::make('sku')->label(__('sales.fields.sku'))->searchable()->color('gray')->visibleFrom('md'),
                TextColumn::make('concentration')
                    ->badge()
                    ->color('gray')
                    ->formatStateUsing(fn (mixed $state): ?string => $state instanceof Concentration ? $state->getLabel() : null)
                    ->visibleFrom('lg'),
                TextColumn::make('price')->money('USD')->alignEnd()->sortable(),
                TextColumn::make('stock')
                    ->numeric()
                    ->alignEnd()
                    ->color(fn (int $state): string => $state === 0 ? 'danger' : ($state < 5 ? 'warning' : 'gray'))
                    ->sortable()
                    ->visibleFrom('md'),
            ])
            ->filters([
                SelectFilter::make('brand_id')->relationship('brand', 'name')->preload()->searchable(),
                SelectFilter::make('category_id')->relationship('category', 'name')->preload(),
            ])
            ->defaultSort('name')
            ->paginationPageOptions([10, 25])
            ->defaultPaginationPageOption(10);
    }
}
