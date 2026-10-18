<?php

declare(strict_types=1);

namespace App\Alfakit\Widgets\Concerns;

use AlfaSix\Alfakit\Widgets\Concerns\InteractsWithPageFilters;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Turns the overview's filters (`startDate`, `endDate`, `scope`, `live`) into the queries
 * every dashboard widget needs: the selected date range, the previous range of the same
 * length, the stores in scope and the revenue-bearing orders.
 */
trait ReadsDashboardFilters
{
    use InteractsWithPageFilters;

    /** Orders that count as revenue. */
    protected const array REVENUE_STATUSES = [OrderStatus::Paid, OrderStatus::Processing, OrderStatus::Shipped, OrderStatus::Delivered];

    /** @return array{0: Carbon, 1: Carbon} */
    protected function range(): array
    {
        $end = $this->date($this->pageFilters['endDate'] ?? null) ?? now();
        $start = $this->date($this->pageFilters['startDate'] ?? null) ?? $end->copy()->subDays(29);

        if ($start->greaterThan($end)) {
            [$start, $end] = [$end, $start];
        }

        return [$start->startOfDay(), $end->endOfDay()];
    }

    /**
     * The period of the same length that ends the day before the selected one starts.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    protected function previousRange(): array
    {
        [$start, $end] = $this->range();
        $days = $start->diffInDays($end) + 1;

        return [$start->copy()->subDays($days)->startOfDay(), $start->copy()->subDay()->endOfDay()];
    }

    protected function rangeDays(): int
    {
        [$start, $end] = $this->range();

        return (int) $start->diffInDays($end) + 1;
    }

    /** @return array<int, int> */
    protected function storeIds(): array
    {
        $tenant = alfakit()->getTenant();

        if (($this->pageFilters['scope'] ?? 'store') === 'all') {
            $user = auth()->user();

            if ($user instanceof User) {
                return $user->stores()->pluck('stores.id')->map(fn (mixed $id): int => (int) $id)->all();
            }
        }

        return $tenant instanceof Store ? [$tenant->id] : [];
    }

    protected function isLive(): bool
    {
        return (bool) ($this->pageFilters['live'] ?? false);
    }

    /** @return Builder<Order> */
    protected function revenueOrders(?Carbon $from = null, ?Carbon $until = null): Builder
    {
        [$start, $end] = $this->range();

        return Order::query()
            ->whereIn('store_id', $this->storeIds())
            ->whereIn('status', array_map(fn (OrderStatus $status): string => $status->value, self::REVENUE_STATUSES))
            ->whereBetween('placed_at', [$from ?? $start, $until ?? $end]);
    }

    /** @return Builder<Order> */
    protected function allOrders(): Builder
    {
        [$start, $end] = $this->range();

        return Order::query()->whereIn('store_id', $this->storeIds())->whereBetween('placed_at', [$start, $end]);
    }

    protected function currency(): string
    {
        $tenant = alfakit()->getTenant();

        return $tenant instanceof Store ? $tenant->currency : 'USD';
    }

    private function date(mixed $value): ?Carbon
    {
        if (! is_string($value) || $value === '') {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }
}
