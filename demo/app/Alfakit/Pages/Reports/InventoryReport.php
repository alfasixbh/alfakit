<?php

declare(strict_types=1);

namespace App\Alfakit\Pages\Reports;

use AlfaSix\Alfakit\Actions\ExportAction;
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Tables\Columns\ImageColumn;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Sum;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\Filter;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Grouping\Group;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Clusters\Reports;
use App\Alfakit\Exports\InventoryExporter;
use App\Alfakit\Widgets\Reports\InventoryStats;
use App\Enums\ProductStatus;
use App\Models\Product;
use App\Models\Setting;
use App\Models\Store;
use Illuminate\Database\Eloquent\Builder;

/**
 * Inventory report: stock, cost and value per product with a level badge computed against
 * the store's low-stock threshold, grouped by category on request.
 */
class InventoryReport extends Page
{
    protected static ?string $cluster = Reports::class;

    protected static ?string $navigationIcon = 'boxes';

    protected static ?int $navigationSort = 2;

    protected static ?string $slug = 'inventory';

    public static function getNavigationLabel(): string
    {
        return __('platform.reports.inventory.title');
    }

    public function getTitle(): string
    {
        return __('platform.reports.inventory.title');
    }

    public function getSubheading(): ?string
    {
        return __('platform.reports.inventory.description');
    }

    protected function getHeaderWidgets(): array
    {
        return [InventoryStats::class];
    }

    public function getHeaderWidgetsColumns(): int|array
    {
        return 1;
    }

    public function table(Table $table): Table
    {
        $tenant = alfakit()->getTenant();
        $currency = $tenant instanceof Store ? $tenant->currency : 'USD';
        $threshold = (int) (Setting::query()->where('store_id', $tenant?->getKey())->value('low_stock_threshold') ?? 5);

        $level = fn (Product $record): string => match (true) {
            $record->stock <= 0 => 'out',
            $record->stock <= $threshold => 'low',
            default => 'healthy',
        };

        return $table
            ->query(Product::query()
                ->where('store_id', $tenant?->getKey())
                ->with(['brand:id,name', 'category:id,name'])
                ->selectRaw('products.*, stock * COALESCE(cost, 0) as stock_value'))
            ->columns([
                ImageColumn::make('images.0')
                    ->label('')
                    ->disk('demo')
                    ->size(36),
                TextColumn::make('name')
                    ->label(__('platform.reports.inventory.columns.product'))
                    ->description(fn (Product $record): string => $record->sku)
                    ->weight('medium')
                    ->searchable(['name', 'sku'])
                    ->sortable(),
                TextColumn::make('brand.name')
                    ->label(__('platform.reports.inventory.columns.brand'))
                    ->visibleFrom('lg')
                    ->toggleable(),
                TextColumn::make('category.name')
                    ->label(__('platform.reports.inventory.columns.category'))
                    ->visibleFrom('md')
                    ->toggleable(),
                TextColumn::make('status')
                    ->label(__('platform.reports.inventory.columns.status'))
                    ->badge()
                    ->formatStateUsing(fn (ProductStatus $state): string => $state->getLabel())
                    ->color(fn (ProductStatus $state): string => $state->getColor())
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('level')
                    ->label(__('platform.reports.inventory.columns.level'))
                    ->getStateUsing($level)
                    ->formatStateUsing(fn (string $state): string => __('platform.reports.inventory.levels.'.$state))
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'out' => 'danger',
                        'low' => 'warning',
                        default => 'success',
                    })
                    ->icon(fn (string $state): string => match ($state) {
                        'out' => 'package-x',
                        'low' => 'triangle-alert',
                        default => 'circle-check',
                    }),
                TextColumn::make('stock')
                    ->label(__('platform.reports.inventory.columns.stock'))
                    ->numeric()
                    ->alignEnd()
                    ->sortable()
                    ->summarize(Sum::make()),
                TextColumn::make('cost')
                    ->label(__('platform.reports.inventory.columns.cost'))
                    ->money($currency)
                    ->alignEnd()
                    ->sortable()
                    ->visibleFrom('lg'),
                TextColumn::make('stock_value')
                    ->label(__('platform.reports.inventory.columns.value'))
                    ->money($currency)
                    ->alignEnd()
                    ->sortable()
                    ->summarize(Sum::make()->money($currency)),
                TextColumn::make('price')
                    ->label(__('platform.reports.inventory.columns.price'))
                    ->money($currency)
                    ->alignEnd()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultSort('stock')
            ->filters([
                SelectFilter::make('level')
                    ->label(__('platform.reports.inventory.filters.level'))
                    ->options([
                        'out' => __('platform.reports.inventory.levels.out'),
                        'low' => __('platform.reports.inventory.levels.low'),
                        'healthy' => __('platform.reports.inventory.levels.healthy'),
                    ])
                    ->query(fn (Builder $query, array $data): Builder => match ($data['value'] ?? null) {
                        'out' => $query->where('stock', '<=', 0),
                        'low' => $query->where('stock', '>', 0)->where('stock', '<=', $threshold),
                        'healthy' => $query->where('stock', '>', $threshold),
                        default => $query,
                    }),
                SelectFilter::make('category')
                    ->label(__('platform.reports.inventory.filters.category'))
                    ->relationship('category', 'name')
                    ->preload(),
                SelectFilter::make('brand')
                    ->label(__('platform.reports.inventory.filters.brand'))
                    ->relationship('brand', 'name')
                    ->searchable()
                    ->preload(),
                Filter::make('active')
                    ->label(__('demo.product_status.active'))
                    ->toggle()
                    ->default(['isActive' => true])
                    ->query(fn (Builder $query): Builder => $query->where('status', ProductStatus::Active->value)),
            ])
            ->groups([
                Group::make('category.name')->label(__('platform.reports.inventory.columns.category'))->collapsible(),
                Group::make('brand.name')->label(__('platform.reports.inventory.columns.brand'))->collapsible(),
            ])
            ->headerActions([
                ExportAction::make()
                    ->label(__('platform.reports.inventory.export'))
                    ->icon('download')
                    ->exporter(InventoryExporter::class)
                    ->rateLimit(5),
            ])
            ->persistFiltersInSession()
            ->defaultPaginationPageOption(25);
    }
}
