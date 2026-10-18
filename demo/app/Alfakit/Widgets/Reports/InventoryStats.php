<?php

declare(strict_types=1);

namespace App\Alfakit\Widgets\Reports;

use AlfaSix\Alfakit\Support\Currency;
use AlfaSix\Alfakit\Widgets\StatsOverviewWidget;
use AlfaSix\Alfakit\Widgets\StatsOverviewWidget\Stat;
use App\Enums\ProductStatus;
use App\Models\Product;
use App\Models\Setting;
use App\Models\Store;

/**
 * Header widget of the inventory report: active SKUs, units, stock value at cost and the
 * low / out-of-stock counts against the store's own threshold.
 */
class InventoryStats extends StatsOverviewWidget
{
    protected static bool $isDiscovered = false;

    protected function getColumns(): int|array|null
    {
        return ['default' => 1, 'sm' => 2, 'xl' => 4];
    }

    protected function getStats(): array
    {
        $tenant = alfakit()->getTenant();
        $storeId = $tenant?->getKey();
        $currency = $tenant instanceof Store ? $tenant->currency : 'USD';
        $threshold = (int) (Setting::query()->where('store_id', $storeId)->value('low_stock_threshold') ?? 5);

        $active = Product::query()->where('store_id', $storeId)->where('status', ProductStatus::Active->value);

        $totals = (clone $active)->selectRaw('COUNT(*) as skus, COALESCE(SUM(stock), 0) as units, COALESCE(SUM(stock * COALESCE(cost, 0)), 0) as value')->first();
        $low = (clone $active)->where('stock', '>', 0)->where('stock', '<=', $threshold)->count();
        $out = (clone $active)->where('stock', 0)->count();

        return [
            Stat::make(__('platform.reports.inventory.stats.skus'), number_format((int) ($totals?->getAttribute('skus') ?? 0)))
                ->icon('demo::bottle')
                ->color('primary'),
            Stat::make(__('platform.reports.inventory.stats.units'), number_format((int) ($totals?->getAttribute('units') ?? 0)))
                ->icon('boxes')
                ->color('info'),
            Stat::make(__('platform.reports.inventory.stats.value'), Currency::format((float) ($totals?->getAttribute('value') ?? 0), $currency))
                ->icon('demo::revenue')
                ->color('success'),
            Stat::make(__('platform.reports.inventory.stats.low'), number_format($low))
                ->description(__('platform.reports.inventory.stats.low_help', ['threshold' => $threshold]))
                ->descriptionIcon('triangle-alert')
                ->icon('package-minus')
                ->color($low > 0 ? 'warning' : 'gray'),
            Stat::make(__('platform.reports.inventory.stats.out'), number_format($out))
                ->icon('package-x')
                ->color($out > 0 ? 'danger' : 'gray'),
        ];
    }
}
