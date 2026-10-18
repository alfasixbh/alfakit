<?php

declare(strict_types=1);

namespace App\Alfakit\Widgets;

use AlfaSix\Alfakit\Tables\Columns\ImageColumn;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\Alfakit\Widgets\TableWidget;
use App\Alfakit\Widgets\Concerns\ReadsDashboardFilters;
use App\Enums\OrderStatus;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Storage;

/**
 * The period's best sellers: products ranked by the revenue of their order lines, with
 * units sold and the share of the period's revenue. The table keeps its own query string
 * (`top-products[...]`), so sorting it doesn't disturb the dashboard filters.
 */
class TopProductsTable extends TableWidget
{
    use ReadsDashboardFilters;

    protected static ?int $sort = 4;

    /** @var int|string|array<string, int|string|null> */
    protected int|string|array $columnSpan = ['default' => 1, 'md' => 2];

    public function table(Table $table): Table
    {
        [$start, $end] = $this->range();
        $storeIds = $this->storeIds();
        $statuses = array_map(fn (OrderStatus $status): string => $status->value, self::REVENUE_STATUSES);

        $periodRevenue = (float) $this->revenueOrders()->sum('total');

        $lines = fn (Builder $query): Builder => $query
            ->whereHas('order', fn (Builder $orders) => $orders
                ->whereIn('store_id', $storeIds)
                ->whereIn('status', $statuses)
                ->whereBetween('placed_at', [$start, $end]));

        return $table
            ->heading(__('platform.dashboard.top_products.heading'))
            ->description(__('platform.dashboard.top_products.description'))
            ->query(Product::query()->whereIn('store_id', $storeIds)->with(['brand']))
            ->columns([
                ImageColumn::make('images.0')
                    ->label('')
                    ->getStateUsing(fn (Product $record): ?string => isset($record->images[0]) ? Storage::disk('demo')->url($record->images[0]) : null)
                    ->size(40),
                TextColumn::make('name')
                    ->label(__('platform.dashboard.top_products.product'))
                    ->description(fn (Product $record): string => $record->brand?->getAttribute('name') ?? $record->sku)
                    ->weight('medium')
                    ->searchable(),
                TextColumn::make('period_units')
                    ->label(__('platform.dashboard.top_products.units'))
                    ->sum(['orderItems as period_units' => $lines], 'quantity')
                    ->numeric()
                    ->alignEnd()
                    ->sortable(),
                TextColumn::make('period_revenue')
                    ->label(__('platform.dashboard.top_products.revenue'))
                    ->sum(['orderItems as period_revenue' => $lines], 'total')
                    ->money($this->currency())
                    ->alignEnd()
                    ->sortable(),
                TextColumn::make('share')
                    ->label(__('platform.dashboard.top_products.share'))
                    ->getStateUsing(fn (Product $record): string => $periodRevenue > 0
                        ? number_format((float) $record->getAttribute('period_revenue') / $periodRevenue * 100, 1).'%'
                        : '0%')
                    ->badge()
                    ->color('gray')
                    ->alignEnd(),
                TextColumn::make('stock')
                    ->label(__('platform.dashboard.top_products.stock'))
                    ->numeric()
                    ->alignEnd()
                    ->color(fn (Product $record): string => $record->stock === 0 ? 'danger' : ($record->stock <= 5 ? 'warning' : 'gray'))
                    ->sortable(),
            ])
            ->defaultSort('period_revenue', 'desc')
            ->paginated(false)
            ->modifyQueryUsing(fn (Builder $query) => $query->whereHas('orderItems', $lines)->limit(8))
            ->poll($this->isLive() ? '10s' : null);
    }
}
