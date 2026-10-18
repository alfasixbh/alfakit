<?php

declare(strict_types=1);

namespace App\Alfakit\Widgets;

use AlfaSix\Alfakit\Support\Currency;
use AlfaSix\Alfakit\Widgets\StatsOverviewWidget;
use AlfaSix\Alfakit\Widgets\StatsOverviewWidget\Stat;
use App\Alfakit\Widgets\Concerns\ReadsDashboardFilters;
use App\Models\Customer;
use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Four KPI cards with sparklines: revenue, orders, average order and new customers in the
 * selected period, each compared with the previous period of the same length. Polls
 * every ten seconds while the "Live updates" filter is on.
 */
class StoreStats extends StatsOverviewWidget
{
    use ReadsDashboardFilters;

    protected static ?int $sort = 1;

    protected function getPollingInterval(): ?string
    {
        return $this->isLive() ? '10s' : null;
    }

    protected function getDescription(): ?string
    {
        [$start, $end] = $this->range();

        $range = __('platform.dashboard.stats.range', [
            'from' => $start->translatedFormat('j M Y'),
            'to' => $end->translatedFormat('j M Y'),
        ]);

        return $this->isLive() ? $range.' · '.__('platform.dashboard.stats.live') : $range;
    }

    protected function getColumns(): int|array|null
    {
        return ['default' => 1, 'sm' => 2, 'xl' => 4];
    }

    protected function getStats(): array
    {
        [$previousStart, $previousEnd] = $this->previousRange();
        $currency = $this->currency();

        $current = $this->revenueOrders()->selectRaw('COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders')->first();
        $previous = $this->revenueOrders($previousStart, $previousEnd)->selectRaw('COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders')->first();

        $revenue = (float) ($current?->getAttribute('revenue') ?? 0);
        $orders = (int) ($current?->getAttribute('orders') ?? 0);
        $previousRevenue = (float) ($previous?->getAttribute('revenue') ?? 0);
        $previousOrders = (int) ($previous?->getAttribute('orders') ?? 0);

        $average = $orders > 0 ? $revenue / $orders : 0.0;
        $previousAverage = $previousOrders > 0 ? $previousRevenue / $previousOrders : 0.0;

        $customers = $this->newCustomers()->count();
        $previousCustomers = $this->newCustomers($previousStart, $previousEnd)->count();

        $dailyRevenue = $this->daily(fn (Builder $query) => $query->selectRaw('DATE(placed_at) as day, SUM(total) as value'));
        $dailyOrders = $this->daily(fn (Builder $query) => $query->selectRaw('DATE(placed_at) as day, COUNT(*) as value'));

        return [
            Stat::make(__('platform.dashboard.stats.revenue'), Currency::format($revenue, $currency))
                ->icon('demo::revenue')
                ->description($this->change($revenue, $previousRevenue))
                ->descriptionIcon($this->trendIcon($revenue, $previousRevenue))
                ->color($this->trendColor($revenue, $previousRevenue))
                ->chart($dailyRevenue),
            Stat::make(__('platform.dashboard.stats.orders'), number_format($orders))
                ->icon('shopping-bag')
                ->description($this->change($orders, $previousOrders))
                ->descriptionIcon($this->trendIcon($orders, $previousOrders))
                ->color($this->trendColor($orders, $previousOrders))
                ->chart($dailyOrders),
            Stat::make(__('platform.dashboard.stats.average_order'), Currency::format($average, $currency))
                ->icon('receipt')
                ->description($this->change($average, $previousAverage))
                ->descriptionIcon($this->trendIcon($average, $previousAverage))
                ->color($this->trendColor($average, $previousAverage))
                ->chart($this->averages($dailyRevenue, $dailyOrders)),
            Stat::make(__('platform.dashboard.stats.new_customers'), number_format($customers))
                ->icon('user-plus')
                ->description($this->change($customers, $previousCustomers))
                ->descriptionIcon($this->trendIcon($customers, $previousCustomers))
                ->color($this->trendColor($customers, $previousCustomers))
                ->chart($this->dailyCustomers()),
        ];
    }

    /** @return Builder<Customer> */
    private function newCustomers(?Carbon $from = null, ?Carbon $until = null): Builder
    {
        [$start, $end] = $this->range();

        return Customer::query()->whereIn('store_id', $this->storeIds())->whereBetween('created_at', [$from ?? $start, $until ?? $end]);
    }

    /**
     * One value per day of the range, zero-filled, from an aggregate on the revenue orders.
     *
     * @param  callable(Builder<Order>): Builder<Order>  $select
     * @return array<int, float>
     */
    private function daily(callable $select): array
    {
        $rows = $select($this->revenueOrders())->groupBy('day')->pluck('value', 'day');

        return $this->fill($rows->map(fn (mixed $value): float => (float) $value)->all());
    }

    /** @return array<int, float> */
    private function dailyCustomers(): array
    {
        $rows = $this->newCustomers()->selectRaw('DATE(created_at) as day, COUNT(*) as value')->groupBy('day')->pluck('value', 'day');

        return $this->fill($rows->map(fn (mixed $value): float => (float) $value)->all());
    }

    /**
     * @param  array<string, float>  $byDay
     * @return array<int, float>
     */
    private function fill(array $byDay): array
    {
        [$start] = $this->range();
        $days = min($this->rangeDays(), 90);
        $values = [];

        for ($i = 0; $i < $days; $i++) {
            $values[] = $byDay[$start->copy()->addDays($i)->toDateString()] ?? 0.0;
        }

        return $values;
    }

    /**
     * @param  array<int, float>  $revenue
     * @param  array<int, float>  $orders
     * @return array<int, float>
     */
    private function averages(array $revenue, array $orders): array
    {
        return array_map(
            fn (float $sum, float $count): float => $count > 0 ? round($sum / $count, 2) : 0.0,
            $revenue,
            $orders,
        );
    }

    private function change(float $current, float $previous): string
    {
        if ($previous <= 0) {
            return __('platform.dashboard.stats.change_new');
        }

        $percent = ($current - $previous) / $previous * 100;

        if (abs($percent) < 0.5) {
            return __('platform.dashboard.stats.change_flat');
        }

        return __($percent > 0 ? 'platform.dashboard.stats.change_up' : 'platform.dashboard.stats.change_down', ['percent' => number_format(abs($percent), 1)]);
    }

    private function trendIcon(float $current, float $previous): string
    {
        return match (true) {
            $previous <= 0 || abs($current - $previous) < 0.0001 => 'minus',
            $current > $previous => 'trending-up',
            default => 'trending-down',
        };
    }

    private function trendColor(float $current, float $previous): string
    {
        return match (true) {
            $previous <= 0 || abs($current - $previous) < 0.0001 => 'gray',
            $current > $previous => 'success',
            default => 'danger',
        };
    }
}
