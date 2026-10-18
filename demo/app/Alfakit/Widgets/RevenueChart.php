<?php

declare(strict_types=1);

namespace App\Alfakit\Widgets;

use AlfaSix\Alfakit\Widgets\ChartWidget;
use App\Alfakit\Widgets\Concerns\ReadsDashboardFilters;
use Illuminate\Support\Carbon;

/**
 * Revenue over the selected period as a line, with the order count on a second axis. No
 * colours are set: the renderer paints datasets with the theme's chart palette and re-reads
 * it when the theme or dark mode changes.
 */
class RevenueChart extends ChartWidget
{
    use ReadsDashboardFilters;

    protected static ?int $sort = 2;

    /** @var int|string|array<string, int|string|null> */
    protected int|string|array $columnSpan = ['default' => 1, 'md' => 2];

    protected ?string $maxHeight = '20rem';

    protected function getHeading(): ?string
    {
        return __('platform.dashboard.revenue_chart.heading');
    }

    protected function getDescription(): ?string
    {
        return __('platform.dashboard.revenue_chart.description');
    }

    protected function getChartType(): string
    {
        return 'line';
    }

    protected function getPollingInterval(): ?string
    {
        return $this->isLive() ? '10s' : null;
    }

    protected function getFilters(): ?array
    {
        $days = $this->rangeDays();

        return [
            ...($days <= 92 ? ['daily' => __('platform.dashboard.periods.daily')] : []),
            ...($days >= 14 ? ['weekly' => __('platform.dashboard.periods.weekly')] : []),
            ...($days >= 60 ? ['monthly' => __('platform.dashboard.periods.monthly')] : []),
        ];
    }

    protected function getData(): array
    {
        [$start, $end] = $this->range();
        $bucket = $this->getFilter() ?? 'daily';

        $rows = $this->revenueOrders()
            ->selectRaw('DATE(placed_at) as day, SUM(total) as revenue, COUNT(*) as orders')
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        $revenue = [];
        $orders = [];

        foreach ($rows as $row) {
            $key = $this->bucketKey(Carbon::parse((string) $row->getAttribute('day')), $bucket);
            $revenue[$key] = ($revenue[$key] ?? 0) + (float) $row->getAttribute('revenue');
            $orders[$key] = ($orders[$key] ?? 0) + (int) $row->getAttribute('orders');
        }

        $labels = [];
        $revenueSeries = [];
        $orderSeries = [];

        foreach ($this->buckets($start, $end, $bucket) as $key => $label) {
            $labels[] = $label;
            $revenueSeries[] = round($revenue[$key] ?? 0, 2);
            $orderSeries[] = $orders[$key] ?? 0;
        }

        return [
            'labels' => $labels,
            'datasets' => [
                ['label' => __('platform.dashboard.revenue_chart.revenue'), 'data' => $revenueSeries, 'yAxisID' => 'y'],
                ['label' => __('platform.dashboard.revenue_chart.orders'), 'data' => $orderSeries, 'yAxisID' => 'orders', 'fill' => false, 'borderDash' => [4, 4], 'pointRadius' => 0],
            ],
        ];
    }

    protected function getOptions(): ?array
    {
        return [
            'interaction' => ['mode' => 'index', 'intersect' => false],
            'scales' => [
                'y' => ['beginAtZero' => true, 'ticks' => ['maxTicksLimit' => 6]],
                'orders' => ['position' => 'right', 'beginAtZero' => true, 'grid' => ['drawOnChartArea' => false], 'ticks' => ['precision' => 0, 'maxTicksLimit' => 5]],
                'x' => ['ticks' => ['maxTicksLimit' => 12, 'maxRotation' => 0]],
            ],
        ];
    }

    private function bucketKey(Carbon $day, string $bucket): string
    {
        return match ($bucket) {
            'weekly' => $day->copy()->startOfWeek()->toDateString(),
            'monthly' => $day->format('Y-m'),
            default => $day->toDateString(),
        };
    }

    /** @return array<string, string> bucket key => axis label */
    private function buckets(Carbon $start, Carbon $end, string $bucket): array
    {
        $labels = [];
        $cursor = match ($bucket) {
            'weekly' => $start->copy()->startOfWeek(),
            'monthly' => $start->copy()->startOfMonth(),
            default => $start->copy(),
        };

        while ($cursor->lessThanOrEqualTo($end)) {
            $labels[$this->bucketKey($cursor, $bucket)] = match ($bucket) {
                'weekly' => $cursor->translatedFormat('j M'),
                'monthly' => $cursor->translatedFormat('M Y'),
                default => $cursor->translatedFormat('j M'),
            };

            $cursor = match ($bucket) {
                'weekly' => $cursor->addWeek(),
                'monthly' => $cursor->addMonth(),
                default => $cursor->addDay(),
            };
        }

        return $labels;
    }
}
