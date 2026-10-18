<?php

declare(strict_types=1);

namespace App\Alfakit\Widgets\Reports;

use AlfaSix\Alfakit\Widgets\ChartWidget;
use App\Enums\OrderStatus;
use App\Models\Order;

/**
 * Header widget of the sales report: revenue bars with the order count as a line, for the
 * period picked in the widget's own dropdown. Not a dashboard widget (`$isDiscovered`).
 */
class SalesByMonthChart extends ChartWidget
{
    protected static bool $isDiscovered = false;

    protected ?string $maxHeight = '18rem';

    /** @var int|string|array<string, int|string|null> */
    protected int|string|array $columnSpan = 'full';

    protected function getHeading(): ?string
    {
        return __('platform.reports.sales.chart_heading');
    }

    protected function getDescription(): ?string
    {
        return __('platform.reports.sales.chart_description');
    }

    protected function getChartType(): string
    {
        return 'bar';
    }

    protected function getFilters(): ?array
    {
        return [
            'year' => __('platform.reports.sales.this_year'),
            'quarter' => __('platform.reports.sales.this_quarter'),
            'month' => __('platform.reports.sales.this_month'),
        ];
    }

    protected function getData(): array
    {
        $filter = $this->getFilter() ?? 'year';
        $start = match ($filter) {
            'month' => now()->subDays(29)->startOfDay(),
            'quarter' => now()->subDays(89)->startOfDay(),
            default => now()->subMonths(11)->startOfMonth(),
        };
        $format = $filter === 'year' ? 'Y-m' : 'Y-m-d';

        // SQLite is the demo database; swap strftime() for DATE_FORMAT() on MySQL.
        $bucketSql = $filter === 'year' ? "strftime('%Y-%m', placed_at)" : 'DATE(placed_at)';

        $rows = Order::query()
            ->where('store_id', alfakit()->getTenant()?->getKey())
            ->whereIn('status', [OrderStatus::Paid->value, OrderStatus::Processing->value, OrderStatus::Shipped->value, OrderStatus::Delivered->value])
            ->where('placed_at', '>=', $start)
            ->selectRaw($bucketSql.' as bucket, SUM(total) as revenue, COUNT(*) as orders')
            ->groupBy('bucket')
            ->get()
            ->keyBy('bucket');

        $labels = [];
        $revenue = [];
        $orders = [];
        $cursor = $start->copy();
        $end = now();

        while ($cursor->lessThanOrEqualTo($end)) {
            $key = $cursor->format($format);
            $labels[] = $filter === 'year' ? $cursor->translatedFormat('M Y') : $cursor->translatedFormat('j M');
            $revenue[] = round((float) ($rows[$key]?->getAttribute('revenue') ?? 0), 2);
            $orders[] = (int) ($rows[$key]?->getAttribute('orders') ?? 0);
            $cursor = $filter === 'year' ? $cursor->addMonth() : $cursor->addDay();
        }

        return [
            'labels' => $labels,
            'datasets' => [
                ['label' => __('platform.reports.sales.revenue'), 'data' => $revenue, 'yAxisID' => 'y', 'borderRadius' => 4, 'maxBarThickness' => 28],
                ['type' => 'line', 'label' => __('platform.reports.sales.orders'), 'data' => $orders, 'yAxisID' => 'orders', 'tension' => 0.3, 'pointRadius' => 2],
            ],
        ];
    }

    protected function getOptions(): ?array
    {
        return [
            'interaction' => ['mode' => 'index', 'intersect' => false],
            'scales' => [
                'y' => ['beginAtZero' => true],
                'orders' => ['position' => 'right', 'beginAtZero' => true, 'grid' => ['drawOnChartArea' => false], 'ticks' => ['precision' => 0]],
                'x' => ['ticks' => ['maxTicksLimit' => 12, 'maxRotation' => 0]],
            ],
        ];
    }
}
